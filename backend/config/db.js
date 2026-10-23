import pg from 'pg';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbMode = 'sqlite'; // 'postgresql' | 'sqlite'
let pgPool = null;
let sqliteDb = null;

// Ensure backend/data directory exists for SQLite
const dataDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Convert PostgreSQL $1, $2, ... placeholders to SQLite ?, ?, ...
function pgToSqliteQuery(sql, params = []) {
  const finalParams = [];
  const convertedSql = sql.replace(/\$(\d+)/g, (match, num) => {
    const idx = parseInt(num, 10) - 1;
    finalParams.push(params[idx]);
    return '?';
  });
  return { sql: convertedSql, params: finalParams };
}

// Normalizer: ensure SQLite rows format booleans and dates similarly to PG
function normalizeRow(row) {
  if (!row) return row;
  const normalized = { ...row };
  for (const [key, value] of Object.entries(normalized)) {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      normalized[key] = new Date(value);
    }
  }
  return normalized;
}

export async function initDatabase() {
  const hasPgConfig = process.env.DATABASE_URL || (process.env.PGUSER && process.env.PGPASSWORD);

  if (hasPgConfig) {
    try {
      const config = process.env.DATABASE_URL
        ? { connectionString: process.env.DATABASE_URL }
        : {
            user: process.env.PGUSER || 'postgres',
            password: process.env.PGPASSWORD,
            host: process.env.PGHOST || 'localhost',
            port: parseInt(process.env.PGPORT || '5432', 10),
            database: process.env.PGDATABASE || 'ticket_reservation_db',
            connectionTimeoutMillis: 3000,
          };

      const testPool = new pg.Pool(config);
      const res = await testPool.query('SELECT NOW()');
      if (res.rows.length > 0) {
        pgPool = testPool;
        dbMode = 'postgresql';
        console.log(`\x1b[32m✔ [DATABASE] Connected to PostgreSQL successfully on ${config.host || 'remote'}\x1b[0m`);
        return { mode: dbMode, pool: pgPool };
      }
    } catch (err) {
      console.warn(`\x1b[33m⚠ [DATABASE] PostgreSQL connection skipped (${err.message}). Defaulting to SQLite WAL fallback.\x1b[0m`);
    }
  }

  // SQLite fallback
  const sqliteFile = path.resolve(dataDir, 'app.db');
  sqliteDb = new Database(sqliteFile);
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('foreign_keys = ON');
  sqliteDb.pragma('busy_timeout = 5000');
  dbMode = 'sqlite';
  console.log(`\x1b[36m✔ [DATABASE] SQLite WAL mode initialized at: ${sqliteFile} (Zero-config, ACID compliant)\x1b[0m`);
  return { mode: dbMode, db: sqliteDb };
}

/**
 * Universal query runner supporting $1, $2 parameters across PostgreSQL and SQLite
 */
export async function query(sql, params = []) {
  if (dbMode === 'postgresql' && pgPool) {
    const start = Date.now();
    const res = await pgPool.query(sql, params);
    return {
      rows: res.rows,
      rowCount: res.rowCount,
      duration: Date.now() - start
    };
  }

  // SQLite execution
  if (!sqliteDb) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }

  // Remove PostgreSQL specific clauses that SQLite does not understand, e.g. "FOR UPDATE"
  let cleanSql = sql.replace(/\bFOR\s+UPDATE\b/gi, '');
  
  // Replace PostgreSQL date/time functions with SQLite equivalents if present
  cleanSql = cleanSql.replace(/TIMESTAMP WITH TIME ZONE/gi, 'DATETIME');

  const { sql: finalSql, params: finalParams } = pgToSqliteQuery(cleanSql, params);

  const trimmed = finalSql.trim();
  const isSelect = /^(SELECT|PRAGMA)/i.test(trimmed);

  try {
    if (isSelect) {
      const stmt = sqliteDb.prepare(finalSql);
      const rows = stmt.all(...finalParams).map(normalizeRow);
      return {
        rows,
        rowCount: rows.length,
      };
    } else {
      const stmt = sqliteDb.prepare(finalSql);
      const info = stmt.run(...finalParams);
      return {
        rows: [],
        rowCount: info.changes,
        lastInsertRowid: info.lastInsertRowid,
      };
    }
  } catch (error) {
    console.error(`[DB Query Error] Query: ${finalSql} | Params: ${JSON.stringify(finalParams)} | Error: ${error.message}`);
    throw error;
  }
}

let sqliteMutex = Promise.resolve();

/**
 * Atomic transaction execution with concurrency guarantee
 */
export async function transaction(callback) {
  if (dbMode === 'postgresql' && pgPool) {
    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');
      const txQuery = async (sql, params = []) => {
        const res = await client.query(sql, params);
        return { rows: res.rows, rowCount: res.rowCount };
      };
      const result = await callback({ query: txQuery, client });
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // SQLite transaction with IMMEDIATE lock and FIFO queue (prevents write race conditions completely)
  if (!sqliteDb) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }

  const txQuery = async (sql, params = []) => {
    return query(sql, params);
  };

  return new Promise((resolve, reject) => {
    sqliteMutex = sqliteMutex.then(async () => {
      try {
        sqliteDb.exec('BEGIN IMMEDIATE');
        const result = await callback({ query: txQuery, db: sqliteDb });
        sqliteDb.exec('COMMIT');
        resolve(result);
      } catch (err) {
        try {
          sqliteDb.exec('ROLLBACK');
        } catch (rbErr) {}
        reject(err);
      }
    }).catch(() => {
      // Keep queue flowing
    });
  });
}

export function getDbMode() {
  return dbMode;
}

export function getClient() {
  return dbMode === 'postgresql' ? pgPool : sqliteDb;
}
