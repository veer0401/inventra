import type { IOfflineStorageDriver, QueryResult } from "./types";

/**
 * Tauri Plugin SQL Driver for Desktop Native SQLite.
 * Communicates via IPC with native SQLite database on Windows / Linux / macOS.
 */
export class TauriSqliteDriver implements IOfflineStorageDriver {
  private db: any = null;
  private dbPath: string;

  constructor(dbPath = "sqlite:inventra_desktop.db") {
    this.dbPath = dbPath;
  }

  public async connect(): Promise<void> {
    if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
      try {
        const Database = (await (Function('return import("@tauri-apps/plugin-sql")')() as Promise<any>)).default;
        this.db = await Database.load(this.dbPath);
      } catch {
        throw new Error("Tauri SQL plugin not available in webview");
      }
    } else {
      throw new Error("TauriSqliteDriver requires native Tauri runtime environment");
    }
  }

  public async disconnect(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }

  public async execute(sql: string, params: unknown[] = []): Promise<QueryResult> {
    if (!this.db) await this.connect();
    const result = await this.db.execute(sql, params);
    return {
      rows: [],
      rowsAffected: result.rowsAffected ?? 0,
      lastInsertId: result.lastInsertId,
    };
  }

  public async query<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
    if (!this.db) await this.connect();
    return await this.db.select(sql, params);
  }

  public async transaction<T>(callback: (trx: IOfflineStorageDriver) => Promise<T>): Promise<T> {
    await this.execute("BEGIN TRANSACTION;");
    try {
      const res = await callback(this);
      await this.execute("COMMIT;");
      return res;
    } catch (err) {
      await this.execute("ROLLBACK;");
      throw err;
    }
  }
}
