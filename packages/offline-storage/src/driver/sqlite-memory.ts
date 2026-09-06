import type { IOfflineStorageDriver, QueryResult } from "./types";

/**
 * In-Memory SQLite Simulation Driver.
 * Provides high-speed relational storage, indexing, and transactional guarantees
 * for automated unit tests and browser fallback.
 */
export class MemorySqliteDriver implements IOfflineStorageDriver {
  private tables = new Map<string, Map<string, Record<string, any>>>();
  private connected = false;
  private inTransaction = false;
  private transactionSnapshot: Map<string, Map<string, Record<string, any>>> | null = null;

  public async connect(): Promise<void> {
    this.connected = true;
  }

  public async disconnect(): Promise<void> {
    this.connected = false;
  }

  public async execute(sql: string, params: unknown[] = []): Promise<QueryResult> {
    if (!this.connected) throw new Error("Database not connected");

    const normalized = sql.replace(/\s+/g, " ").trim();

    if (/^CREATE TABLE/i.test(normalized)) {
      const match = normalized.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?([a-zA-Z0-9_]+)/i);
      if (match) {
        const tableName = match[1].toLowerCase();
        if (!this.tables.has(tableName)) {
          this.tables.set(tableName, new Map());
        }
      }
      return { rows: [], rowsAffected: 0 };
    }

    if (/^CREATE INDEX/i.test(normalized)) {
      return { rows: [], rowsAffected: 0 };
    }

    if (/^INSERT/i.test(normalized)) {
      const match = normalized.match(/INSERT\s+(?:OR\s+REPLACE\s+)?INTO\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
      if (match) {
        const tableName = match[1].toLowerCase();
        const cols = match[2].split(",").map((c) => c.trim().toLowerCase());
        const table = this.getTable(tableName);

        const record: Record<string, any> = {};
        cols.forEach((col, idx) => {
          record[col] = params[idx];
        });

        const pkCol = cols.find((c) => c.endsWith("_id") || c === "id" || c === "key") || cols[0];
        const pkVal = String(record[pkCol] ?? Math.random().toString(36));

        table.set(pkVal, record);
        return { rows: [], rowsAffected: 1, lastInsertId: pkVal };
      }
    }

    if (/^UPDATE/i.test(normalized)) {
      const match = normalized.match(/UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/i);
      if (match) {
        const tableName = match[1].toLowerCase();
        const setClause = match[2];
        const whereClause = match[3];
        const table = this.getTable(tableName);

        // Count parameters used in SET clause
        const setParamCount = (setClause.match(/\?/g) || []).length;
        const setParams = params.slice(0, setParamCount);
        const whereParams = params.slice(setParamCount);

        let affected = 0;
        for (const row of table.values()) {
          if (this.evalWhere(row, whereClause, whereParams)) {
            this.applySet(row, setClause, setParams);
            affected++;
          }
        }
        return { rows: [], rowsAffected: affected };
      }
    }

    if (/^DELETE FROM/i.test(normalized)) {
      const match = normalized.match(/DELETE FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.+))?$/i);
      if (match) {
        const tableName = match[1].toLowerCase();
        const whereClause = match[2];
        const table = this.getTable(tableName);

        let affected = 0;
        for (const [id, row] of Array.from(table.entries())) {
          if (this.evalWhere(row, whereClause, params)) {
            table.delete(id);
            affected++;
          }
        }
        return { rows: [], rowsAffected: affected };
      }
    }

    return { rows: [], rowsAffected: 0 };
  }

  public async query<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
    if (!this.connected) throw new Error("Database not connected");

    const normalized = sql.replace(/\s+/g, " ").trim();
    const match = normalized.match(/SELECT\s+(.+?)\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER BY\s+(.+?))?(?:\s+LIMIT\s+(\d+))?$/i);
    if (!match) {
      return [];
    }

    const selectCols = match[1].trim();
    const tableName = match[2].toLowerCase();
    const whereClause = match[3];
    const orderByClause = match[4];
    const limitVal = match[5] ? parseInt(match[5], 10) : undefined;

    const table = this.getTable(tableName);
    let matchedRows: any[] = [];

    for (const row of table.values()) {
      if (this.evalWhere(row, whereClause, params)) {
        matchedRows.push({ ...row });
      }
    }

    // Handle Aggregates
    if (/^MAX\((.+?)\)(?:\s+as\s+([a-zA-Z0-9_]+))?$/i.test(selectCols)) {
      const aggMatch = selectCols.match(/^MAX\((.+?)\)(?:\s+as\s+([a-zA-Z0-9_]+))?$/i)!;
      const colName = aggMatch[1].trim().toLowerCase();
      const alias = (aggMatch[2] || "max").toLowerCase();

      let maxVal: number | null = null;
      for (const r of matchedRows) {
        const val = Number(r[colName]);
        if (!isNaN(val)) {
          if (maxVal === null || val > maxVal) {
            maxVal = val;
          }
        }
      }
      const resultObj: Record<string, any> = {};
      resultObj[alias] = maxVal;
      return [resultObj] as T[];
    }

    if (/^COUNT\(\*\)(?:\s+as\s+([a-zA-Z0-9_]+))?$/i.test(selectCols)) {
      const aggMatch = selectCols.match(/^COUNT\(\*\)(?:\s+as\s+([a-zA-Z0-9_]+))?$/i)!;
      const alias = (aggMatch[1] || "count").toLowerCase();
      const resultObj: Record<string, any> = {};
      resultObj[alias] = matchedRows.length;
      return [resultObj] as T[];
    }

    // Handle Ordering
    if (orderByClause) {
      const orderParts = orderByClause.split(",").map((p) => p.trim());
      matchedRows.sort((a, b) => {
        for (const part of orderParts) {
          const m = part.match(/([a-zA-Z0-9_]+)(?:\s+(ASC|DESC))?/i);
          if (m) {
            const col = m[1].toLowerCase();
            const isDesc = (m[2] || "ASC").toUpperCase() === "DESC";
            const valA = a[col];
            const valB = b[col];
            if (valA < valB) return isDesc ? 1 : -1;
            if (valA > valB) return isDesc ? -1 : 1;
          }
        }
        return 0;
      });
    }

    if (limitVal !== undefined) {
      matchedRows = matchedRows.slice(0, limitVal);
    }

    return matchedRows as T[];
  }

  public async transaction<T>(callback: (trx: IOfflineStorageDriver) => Promise<T>): Promise<T> {
    if (this.inTransaction) {
      return callback(this);
    }

    this.inTransaction = true;
    this.transactionSnapshot = this.cloneTables();

    try {
      const result = await callback(this);
      this.inTransaction = false;
      this.transactionSnapshot = null;
      return result;
    } catch (err) {
      if (this.transactionSnapshot) {
        this.tables = this.transactionSnapshot;
      }
      this.inTransaction = false;
      this.transactionSnapshot = null;
      throw err;
    }
  }

  private getTable(name: string): Map<string, Record<string, any>> {
    const key = name.toLowerCase();
    let tbl = this.tables.get(key);
    if (!tbl) {
      tbl = new Map<string, Record<string, any>>();
      this.tables.set(key, tbl);
    }
    return tbl;
  }

  private cloneTables(): Map<string, Map<string, Record<string, any>>> {
    const cloned = new Map<string, Map<string, Record<string, any>>>();
    for (const [tName, tData] of this.tables.entries()) {
      const rowMap = new Map<string, Record<string, any>>();
      for (const [rId, rData] of tData.entries()) {
        rowMap.set(rId, { ...rData });
      }
      cloned.set(tName, rowMap);
    }
    return cloned;
  }

  private evalWhere(row: Record<string, any>, whereClause?: string, params: unknown[] = []): boolean {
    if (!whereClause) return true;

    // Tokenize parameters by replacing ? with numbered indexes
    let paramIndex = 0;

    const evalAtomic = (clause: string): boolean => {
      const trimmed = clause.trim();

      // Parentheses
      if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
        const inner = trimmed.substring(1, trimmed.length - 1).trim();
        const orClauses = inner.split(/\s+OR\s+/i);
        return orClauses.some((oc) => evalAtomic(oc));
      }

      // OR evaluation inside a clause
      if (trimmed.includes(" OR ")) {
        const parts = trimmed.split(/\s+OR\s+/i);
        return parts.some((p) => evalAtomic(p));
      }

      // Column IN ('val1', 'val2')
      const inLiteralMatch = trimmed.match(/([a-zA-Z0-9_]+)\s+IN\s*\(([^?)]+)\)/i);
      if (inLiteralMatch) {
        const col = inLiteralMatch[1].toLowerCase();
        const literalList = inLiteralMatch[2].split(",").map((s) => s.trim().replace(/^['"]|['"]$/g, ""));
        return literalList.includes(String(row[col] ?? ""));
      }

      // Column IN (?, ?)
      const inParamMatch = trimmed.match(/([a-zA-Z0-9_]+)\s+IN\s*\(([^)]+)\)/i);
      if (inParamMatch) {
        const col = inParamMatch[1].toLowerCase();
        const count = inParamMatch[2].split(",").length;
        const vals: any[] = [];
        for (let i = 0; i < count; i++) {
          vals.push(params[paramIndex++]);
        }
        return vals.includes(row[col]);
      }

      // Equality col = ?
      const eqMatch = trimmed.match(/([a-zA-Z0-9_]+)\s*=\s*\?/);
      if (eqMatch) {
        const col = eqMatch[1].toLowerCase();
        const pVal = params[paramIndex++];
        return row[col] === pVal || String(row[col] ?? "") === String(pVal ?? "");
      }

      // Greater than col > 0 or col > ?
      const gtMatch = trimmed.match(/([a-zA-Z0-9_]+)\s*>\s*([0-9.]+|\?)/);
      if (gtMatch) {
        const col = gtMatch[1].toLowerCase();
        const threshold = gtMatch[2] === "?" ? Number(params[paramIndex++]) : Number(gtMatch[2]);
        return Number(row[col] ?? 0) > threshold;
      }

      // LIKE col LIKE ?
      const likeMatch = trimmed.match(/([a-zA-Z0-9_]+)\s+LIKE\s*\?/i);
      if (likeMatch) {
        const col = likeMatch[1].toLowerCase();
        const pattern = String(params[paramIndex++] ?? "").replace(/%/g, ".*");
        const regex = new RegExp(pattern, "i");
        return regex.test(String(row[col] ?? ""));
      }

      return true;
    };

    // Split top-level AND conditions
    const andClauses = whereClause.split(/\s+AND\s+/i);
    for (const clause of andClauses) {
      if (!evalAtomic(clause)) {
        return false;
      }
    }

    return true;
  }

  private applySet(row: Record<string, any>, setClause: string, params: unknown[]): void {
    const parts = setClause.split(",");
    let pIdx = 0;
    for (const part of parts) {
      const trimmed = part.trim();

      // col = col + 1
      const incMatch = trimmed.match(/([a-zA-Z0-9_]+)\s*=\s*([a-zA-Z0-9_]+)\s*\+\s*1/i);
      if (incMatch) {
        const col = incMatch[1].trim().toLowerCase();
        row[col] = Number(row[col] ?? 0) + 1;
        continue;
      }

      // col = col - ?
      const subMatch = trimmed.match(/([a-zA-Z0-9_]+)\s*=\s*([a-zA-Z0-9_]+)\s*-\s*\?/);
      if (subMatch) {
        const col = subMatch[1].trim().toLowerCase();
        const currentVal = Number(row[col] ?? 0);
        const subVal = Number(params[pIdx++]);
        row[col] = currentVal - subVal;
        continue;
      }

      // col = 'LITERAL'
      const litMatch = trimmed.match(/([a-zA-Z0-9_]+)\s*=\s*['"]([^'"]*)['"]/);
      if (litMatch) {
        const col = litMatch[1].trim().toLowerCase();
        row[col] = litMatch[2];
        continue;
      }

      // col = NULL
      const nullMatch = trimmed.match(/([a-zA-Z0-9_]+)\s*=\s*NULL/i);
      if (nullMatch) {
        const col = nullMatch[1].trim().toLowerCase();
        row[col] = null;
        continue;
      }

      // col = ?
      const eqMatch = trimmed.match(/([a-zA-Z0-9_]+)\s*=\s*\?/);
      if (eqMatch) {
        const col = eqMatch[1].trim().toLowerCase();
        row[col] = params[pIdx++];
        continue;
      }
    }
  }
}
