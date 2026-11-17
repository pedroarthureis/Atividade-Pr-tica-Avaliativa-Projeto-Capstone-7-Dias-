const Account = require('../domain/entities/Account');
const Money = require('../domain/value-objects/Money');

class SqliteAccountRepository {
  constructor(dbConnection) {
    this.db = dbConnection;
  }

  async create(account) {
    const sql = `
      INSERT INTO accounts (id, account_number, holder_name, document_number, balance_cents, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      account.id,
      account.accountNumber,
      account.holderName,
      account.documentNumber,
      account.balance.cents,
      account.status,
      account.createdAt.toISOString(),
      account.updatedAt.toISOString(),
    ];

    await this.db.run(sql, params);
    return account;
  }

  async findById(id) {
    const sql = 'SELECT * FROM accounts WHERE id = ?';
    const row = await this.db.get(sql, [id]);
    return row ? this._toDomain(row) : null;
  }

  async findByAccountNumber(accountNumber) {
    const sql = 'SELECT * FROM accounts WHERE account_number = ?';
    const row = await this.db.get(sql, [accountNumber]);
    return row ? this._toDomain(row) : null;
  }

  async findByDocumentNumber(documentNumber) {
    const sql = 'SELECT * FROM accounts WHERE document_number = ?';
    const row = await this.db.get(sql, [documentNumber]);
    return row ? this._toDomain(row) : null;
  }

  async updateBalance(id, newBalanceMoney) {
    const now = new Date();
    const sql = 'UPDATE accounts SET balance_cents = ?, updated_at = ? WHERE id = ?';
    await this.db.run(sql, [newBalanceMoney.cents, now.toISOString(), id]);
    return this.findById(id);
  }

  _toDomain(row) {
    return new Account({
      id: row.id,
      accountNumber: row.account_number,
      holderName: row.holder_name,
      documentNumber: row.document_number,
      balance: new Money(row.balance_cents),
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }
}

module.exports = SqliteAccountRepository;
