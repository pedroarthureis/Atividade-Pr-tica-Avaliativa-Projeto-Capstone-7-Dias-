const { DatabaseConnection } = require('../../../src/database/DatabaseConnection');
const SqliteAccountRepository = require('../../../src/repositories/SqliteAccountRepository');
const SqliteTransactionRepository = require('../../../src/repositories/SqliteTransactionRepository');
const StatementService = require('../../../src/services/StatementService');
const Account = require('../../../src/domain/entities/Account');
const { Transaction, TransactionType } = require('../../../src/domain/entities/Transaction');
const Money = require('../../../src/domain/value-objects/Money');

describe('StatementService Integration with Filters (Integration)', () => {
  let dbConnection;
  let accountRepo;
  let transactionRepo;
  let statementService;
  let account;

  beforeEach(async () => {
    dbConnection = new DatabaseConnection();
    await dbConnection.initialize();

    accountRepo = new SqliteAccountRepository(dbConnection);
    transactionRepo = new SqliteTransactionRepository(dbConnection);
    statementService = new StatementService({
      accountRepository: accountRepo,
      transactionRepository: transactionRepo,
    });

    account = new Account({
      accountNumber: '4001-9',
      holderName: 'Carlos Extrato',
      documentNumber: '44455566677',
      balance: Money.fromDecimal(1500.0),
    });
    await accountRepo.create(account);

    // Cria transações com diferentes datas e tipos
    const tx1 = new Transaction({
      accountId: account.id,
      type: TransactionType.CREDIT,
      amount: Money.fromDecimal(500.0),
      balanceAfter: Money.fromDecimal(500.0),
      description: 'Salário',
      createdAt: new Date('2026-11-01T10:00:00Z'),
    });

    const tx2 = new Transaction({
      accountId: account.id,
      type: TransactionType.DEBIT,
      amount: Money.fromDecimal(150.0),
      balanceAfter: Money.fromDecimal(350.0),
      description: 'Supermercado',
      createdAt: new Date('2026-11-05T14:30:00Z'),
    });

    const tx3 = new Transaction({
      accountId: account.id,
      type: TransactionType.CREDIT,
      amount: Money.fromDecimal(1200.0),
      balanceAfter: Money.fromDecimal(1550.0),
      description: 'Freelance',
      createdAt: new Date('2026-11-10T09:15:00Z'),
    });

    const tx4 = new Transaction({
      accountId: account.id,
      type: TransactionType.DEBIT,
      amount: Money.fromDecimal(50.0),
      balanceAfter: Money.fromDecimal(1500.0),
      description: 'Café',
      createdAt: new Date('2026-11-15T18:00:00Z'),
    });

    await transactionRepo.create(tx1);
    await transactionRepo.create(tx2);
    await transactionRepo.create(tx3);
    await transactionRepo.create(tx4);
  });

  afterEach(async () => {
    await dbConnection.close();
  });

  it('deve retornar extrato completo com resumo financeiro correto', async () => {
    const statement = await statementService.getStatement(account.id);

    expect(statement.account.accountNumber).toBe('4001-9');
    expect(statement.summary.transactionCount).toBe(4);
    expect(statement.summary.totalCredits).toBe(1700.0);
    expect(statement.summary.totalDebits).toBe(200.0);
    expect(statement.summary.netFlow).toBe(1500.0);
    expect(statement.transactions.length).toBe(4);
  });

  it('deve filtrar extrato por tipo de transação (somente CREDIT)', async () => {
    const statement = await statementService.getStatement(account.id, { type: 'CREDIT' });

    expect(statement.summary.transactionCount).toBe(2);
    expect(statement.transactions.every((t) => t.type === 'CREDIT')).toBe(true);
    expect(statement.summary.totalCredits).toBe(1700.0);
    expect(statement.summary.totalDebits).toBe(0.0);
  });

  it('deve filtrar extrato por tipo de transação (somente DEBIT)', async () => {
    const statement = await statementService.getStatement(account.id, { type: 'DEBIT' });

    expect(statement.summary.transactionCount).toBe(2);
    expect(statement.transactions.every((t) => t.type === 'DEBIT')).toBe(true);
    expect(statement.summary.totalCredits).toBe(0.0);
    expect(statement.summary.totalDebits).toBe(200.0);
  });

  it('deve filtrar extrato por intervalo de datas', async () => {
    const statement = await statementService.getStatement(account.id, {
      startDate: '2026-11-04T00:00:00Z',
      endDate: '2026-11-12T23:59:59Z',
    });

    expect(statement.summary.transactionCount).toBe(2);
    expect(statement.transactions.map((t) => t.description)).toEqual(
      expect.arrayContaining(['Supermercado', 'Freelance'])
    );
  });
});
