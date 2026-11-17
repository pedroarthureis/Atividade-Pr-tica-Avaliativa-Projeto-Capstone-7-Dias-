const { Transaction, TransactionType } = require('../domain/entities/Transaction');
const { Transfer } = require('../domain/entities/Transfer');
const Money = require('../domain/value-objects/Money');

class SqliteTransactionRepository {
  constructor(dbConnection) {
    this.db = dbConnection;
  }

  async create(transaction) {
    const sql = `
      INSERT INTO transactions (id, account_id, type, amount_cents, balance_after_cents, description, reference_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      transaction.id,
      transaction.accountId,
      transaction.type,
      transaction.amount.cents,
      transaction.balanceAfter.cents,
      transaction.description,
      transaction.referenceId,
      transaction.createdAt.toISOString(),
    ];

    await this.db.run(sql, params);
    return transaction;
  }

  async findByAccountId(accountId, filters = {}) {
    let sql = 'SELECT * FROM transactions WHERE account_id = ?';
    const params = [accountId];

    if (filters.startDate) {
      sql += ' AND created_at >= ?';
      const startIso = new Date(filters.startDate).toISOString();
      params.push(startIso);
    }

    if (filters.endDate) {
      sql += ' AND created_at <= ?';
      const endIso = new Date(filters.endDate).toISOString();
      params.push(endIso);
    }

    if (filters.type && [TransactionType.CREDIT, TransactionType.DEBIT].includes(filters.type)) {
      sql += ' AND type = ?';
      params.push(filters.type);
    }

    sql += ' ORDER BY created_at DESC';

    const rows = await this.db.all(sql, params);
    return rows.map(this._toTransactionDomain);
  }

  async saveTransfer(transfer) {
    const sql = `
      INSERT OR REPLACE INTO transfers (id, source_account_id, destination_account_id, amount_cents, status, idempotency_key, reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      transfer.id,
      transfer.sourceAccountId,
      transfer.destinationAccountId,
      transfer.amount.cents,
      transfer.status,
      transfer.idempotencyKey,
      transfer.reason,
      transfer.createdAt.toISOString(),
    ];

    await this.db.run(sql, params);
    return transfer;
  }

  async findTransferByIdempotencyKey(idempotencyKey) {
    if (!idempotencyKey) return null;
    const sql = 'SELECT * FROM transfers WHERE idempotency_key = ?';
    const row = await this.db.get(sql, [idempotencyKey]);
    if (!row) return null;

    return new Transfer({
      id: row.id,
      sourceAccountId: row.source_account_id,
      destinationAccountId: row.destination_account_id,
      amount: new Money(row.amount_cents),
      status: row.status,
      idempotencyKey: row.idempotency_key,
      reason: row.reason,
      createdAt: new Date(row.created_at),
    });
  }

  _toTransactionDomain(row) {
    return new Transaction({
      id: row.id,
      accountId: row.account_id,
      type: row.type,
      amount: new Money(row.amount_cents),
      balanceAfter: new Money(row.balance_after_cents),
      description: row.description,
      referenceId: row.reference_id,
      createdAt: new Date(row.created_at),
    });
  }
}

module.exports = SqliteTransactionRepository;
