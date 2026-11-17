const initSqlJs = require('sql.js');

class DatabaseConnection {
  constructor() {
    this.db = null;
    this.SQL = null;
    this._lock = Promise.resolve();
  }

  async initialize() {
    if (this.db) return this.db;

    this.SQL = await initSqlJs();
    this.db = new this.SQL.Database();

    // Cria as tabelas do sistema
    this.db.run(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        account_number TEXT UNIQUE NOT NULL,
        holder_name TEXT NOT NULL,
        document_number TEXT UNIQUE NOT NULL,
        balance_cents INTEGER NOT NULL CHECK (balance_cents >= 0),
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('CREDIT', 'DEBIT')),
        amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
        balance_after_cents INTEGER NOT NULL CHECK (balance_after_cents >= 0),
        description TEXT,
        reference_id TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (account_id) REFERENCES accounts (id)
      );

      CREATE TABLE IF NOT EXISTS transfers (
        id TEXT PRIMARY KEY,
        source_account_id TEXT NOT NULL,
        destination_account_id TEXT NOT NULL,
        amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
        status TEXT NOT NULL,
        idempotency_key TEXT UNIQUE,
        reason TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (source_account_id) REFERENCES accounts (id),
        FOREIGN KEY (destination_account_id) REFERENCES accounts (id)
      );

      CREATE TABLE IF NOT EXISTS idempotency_keys (
        key TEXT PRIMARY KEY,
        request_hash TEXT,
        status_code INTEGER NOT NULL,
        response_body TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_transactions_account_date ON transactions(account_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
    `);

    return this.db;
  }

  // Mutex para execução atômica sequencial de blocos de operações críticas
  async withLock(operation) {
    let release;
    const currentLock = this._lock;
    this._lock = new Promise((resolve) => {
      release = resolve;
    });

    await currentLock;
    try {
      return await operation();
    } finally {
      release();
    }
  }

  async run(sql, params = []) {
    this.db.run(sql, params);
    return { success: true };
  }

  async get(sql, params = []) {
    const stmt = this.db.prepare(sql, params);
    let result = null;
    if (stmt.step()) {
      result = stmt.getAsObject();
    }
    stmt.free();
    return result;
  }

  async all(sql, params = []) {
    const stmt = this.db.prepare(sql, params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }

  async close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

const defaultDatabase = new DatabaseConnection();

module.exports = {
  DatabaseConnection,
  defaultDatabase,
};
