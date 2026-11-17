const IdempotencyRecord = require('../domain/value-objects/IdempotencyRecord');

class SqliteIdempotencyRepository {
  constructor(dbConnection) {
    this.db = dbConnection;
  }

  async save(record) {
    const sql = `
      INSERT OR REPLACE INTO idempotency_keys (key, request_hash, status_code, response_body, created_at)
      VALUES (?, ?, ?, ?, ?)
    `;
    const params = [
      record.key,
      record.requestHash,
      record.statusCode,
      JSON.stringify(record.responseBody),
      record.createdAt.toISOString(),
    ];

    await this.db.run(sql, params);
    return record;
  }

  async findByKey(key) {
    if (!key) return null;
    const sql = 'SELECT * FROM idempotency_keys WHERE key = ?';
    const row = await this.db.get(sql, [key]);
    if (!row) return null;

    return new IdempotencyRecord({
      key: row.key,
      requestHash: row.request_hash,
      statusCode: row.status_code,
      responseBody: row.response_body,
      createdAt: new Date(row.created_at),
    });
  }
}

module.exports = SqliteIdempotencyRepository;
