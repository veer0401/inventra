/**
 * Storage Driver Interface for Offline Inventra Operations.
 * Allows switching between Native Tauri SQLite plugin (Desktop) and In-Memory / Test mock drivers.
 */

export interface QueryResult<T = any> {
  rows: T[];
  rowsAffected: number;
  lastInsertId?: number | string;
}

export interface IOfflineStorageDriver {
  /**
   * Connect and initialize database tables
   */
  connect(): Promise<void>;

  /**
   * Close connection
   */
  disconnect(): Promise<void>;

  /**
   * Execute non-query SQL command (INSERT, UPDATE, DELETE, CREATE TABLE)
   */
  execute(sql: string, params?: unknown[]): Promise<QueryResult>;

  /**
   * Execute SELECT query returning typed rows
   */
  query<T = any>(sql: string, params?: unknown[]): Promise<T[]>;

  /**
   * Execute multiple operations inside an atomic transaction.
   * If the callback throws, all operations must be rolled back.
   */
  transaction<T>(callback: (trx: IOfflineStorageDriver) => Promise<T>): Promise<T>;
}
