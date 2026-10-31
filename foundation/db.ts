/**
 * EZbill - Relational Database Connection & Migration Runner
 * Team 1: Foundation, Auth & Database Architecture
 *
 * Uses Node.js built-in `node:sqlite` (DatabaseSync) for 100% offline,
 * zero-external-dependency, ACID transactional database operations.
 */

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

export class DatabaseManager {
  private db: DatabaseSync;
  private dbPath: string;

  constructor(dbPath: string = ':memory:') {
    this.dbPath = dbPath;
    if (dbPath !== ':memory:') {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    this.db = new DatabaseSync(this.dbPath);
    this.configure();
  }

  private configure(): void {
    // Enable Foreign Key constraints and Write-Ahead Logging for high concurrent read/write
    this.db.exec('PRAGMA foreign_keys = ON;');
    if (this.dbPath !== ':memory:') {
      this.db.exec('PRAGMA journal_mode = WAL;');
      this.db.exec('PRAGMA synchronous = NORMAL;');
    }
  }

  public getRawDb(): DatabaseSync {
    return this.db;
  }

  public exec(sql: string): void {
    this.db.exec(sql);
  }

  public query<T = any>(sql: string, params: any[] = []): T[] {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as T[];
  }

  public queryOne<T = any>(sql: string, params: any[] = []): T | null {
    const stmt = this.db.prepare(sql);
    const result = stmt.get(...params);
    return (result as T) || null;
  }

  public run(sql: string, params: any[] = []): { changes: number; lastInsertRowid: number | bigint } {
    const stmt = this.db.prepare(sql);
    return stmt.run(...params);
  }

  public transaction<T>(callback: () => T): T {
    this.db.exec('BEGIN TRANSACTION;');
    try {
      const result = callback();
      this.db.exec('COMMIT;');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK;');
      throw error;
    }
  }

  public runMigrations(migrationsDir?: string): string[] {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    const applied = this.query<{ name: string }>('SELECT name FROM _migrations').map(m => m.name);
    const appliedNow: string[] = [];

    // Locate migrations directory
    const candidates = [
      migrationsDir,
      path.resolve(process.cwd(), 'migrations'),
      path.resolve(process.cwd(), '..', 'migrations'),
      path.resolve(__dirname, '..', 'migrations'),
      path.resolve(__dirname, 'migrations'),
    ].filter(Boolean) as string[];

    let resolvedDir = candidates.find(d => fs.existsSync(d));

    if (resolvedDir && fs.existsSync(resolvedDir)) {
      const files = fs.readdirSync(resolvedDir).filter(f => f.endsWith('.sql')).sort();
      for (const file of files) {
        if (!applied.includes(file)) {
          const sql = fs.readFileSync(path.join(resolvedDir, file), 'utf-8');
          this.transaction(() => {
            this.db.exec(sql);
            this.run('INSERT INTO _migrations (name) VALUES (?)', [file]);
          });
          appliedNow.push(file);
        }
      }
    }

    return appliedNow;
  }

  public close(): void {
    this.db.close();
  }
}

let defaultInstance: DatabaseManager | null = null;

export function getDatabase(dbPath?: string): DatabaseManager {
  if (!defaultInstance) {
    const resolvedPath = dbPath || process.env.DATABASE_FILE || path.resolve(process.cwd(), 'ezbill.db');
    defaultInstance = new DatabaseManager(resolvedPath);
    defaultInstance.runMigrations();
  }
  return defaultInstance;
}

export function resetDatabaseForTesting(): DatabaseManager {
  if (defaultInstance) {
    defaultInstance.close();
    defaultInstance = null;
  }
  const testDb = new DatabaseManager(':memory:');
  testDb.runMigrations();
  defaultInstance = testDb;
  return testDb;
}
