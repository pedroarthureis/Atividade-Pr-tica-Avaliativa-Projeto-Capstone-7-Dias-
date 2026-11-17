const { DatabaseConnection } = require('../../../src/database/DatabaseConnection');
const SqliteAccountRepository = require('../../../src/repositories/SqliteAccountRepository');
const SqliteTransactionRepository = require('../../../src/repositories/SqliteTransactionRepository');
const SqliteIdempotencyRepository = require('../../../src/repositories/SqliteIdempotencyRepository');
const Account = require('../../../src/domain/entities/Account');
const { Transaction, TransactionType } = require('../../../src/domain/entities/Transaction');
const { Transfer } = require('../../../src/domain/entities/Transfer');
const IdempotencyRecord = require('../../../src/domain/value-objects/IdempotencyRecord');
const Money = require('../../../src/domain/value-objects/Money');

describe('SQLite In-Memory Repositories (Integration)', () => {
  let dbConnection;
  let accountRepo;
  let transactionRepo;
  let idempotencyRepo;

  beforeEach(async () => {
    dbConnection = new DatabaseConnection();
    await dbConnection.initialize();
    accountRepo = new SqliteAccountRepository(dbConnection);
    transactionRepo = new SqliteTransactionRepository(dbConnection);
    idempotencyRepo = new SqliteIdempotencyRepository(dbConnection);
  });

  afterEach(async () => {
    await dbConnection.close();
  });

  describe('SqliteAccountRepository', () => {
    it('deve persistir e recuperar conta por ID, número de conta e documento', async () => {
      const account = new Account({
        accountNumber: '998877-1',
        holderName: 'Pedro Arthur Reis',
        documentNumber: '11122233344',
        balance: Money.fromDecimal(1250.5),
      });

      await accountRepo.create(account);

      const foundById = await accountRepo.findById(account.id);
      expect(foundById).not.toBeNull();
      expect(foundById.accountNumber).toBe('998877-1');
      expect(foundById.balance.decimal).toBe(1250.5);

      const foundByNumber = await accountRepo.findByAccountNumber('998877-1');
      expect(foundByNumber.holderName).toBe('Pedro Arthur Reis');

      const foundByDoc = await accountRepo.findByDocumentNumber('11122233344');
      expect(foundByDoc.id).toBe(account.id);
    });

    it('deve atualizar o saldo da conta no banco em memória', async () => {
      const account = new Account({
        accountNumber: '554433-2',
        holderName: 'Cliente Teste',
        documentNumber: '99988877766',
        balance: Money.fromDecimal(300.0),
      });
      await accountRepo.create(account);

      const updated = await accountRepo.updateBalance(account.id, Money.fromDecimal(450.75));

      expect(updated.balance.decimal).toBe(450.75);
    });
  });

  describe('SqliteTransactionRepository', () => {
    it('deve salvar e consultar transações associadas a uma conta', async () => {
      const account = new Account({
        accountNumber: '112233-0',
        holderName: 'Conta Contábil',
        documentNumber: '55566677788',
        balance: Money.fromDecimal(1000.0),
      });
      await accountRepo.create(account);

      const tx1 = new Transaction({
        accountId: account.id,
        type: TransactionType.CREDIT,
        amount: Money.fromDecimal(200.0),
        balanceAfter: Money.fromDecimal(1200.0),
        description: 'Crédito de teste',
      });
      await transactionRepo.create(tx1);

      const list = await transactionRepo.findByAccountId(account.id);
      expect(list.length).toBe(1);
      expect(list[0].amount.decimal).toBe(200.0);
      expect(list[0].type).toBe('CREDIT');
    });

    it('deve salvar e consultar transferências por chave de idempotência', async () => {
      const transfer = new Transfer({
        sourceAccountId: 'acc-src-1',
        destinationAccountId: 'acc-dst-2',
        amount: Money.fromDecimal(80.0),
        idempotencyKey: 'idemp-key-test-01',
      });

      await transactionRepo.saveTransfer(transfer);

      const retrieved = await transactionRepo.findTransferByIdempotencyKey('idemp-key-test-01');
      expect(retrieved).not.toBeNull();
      expect(retrieved.amount.decimal).toBe(80.0);
      expect(retrieved.sourceAccountId).toBe('acc-src-1');
    });
  });

  describe('SqliteIdempotencyRepository', () => {
    it('deve salvar e recuperar registros de idempotência', async () => {
      const record = new IdempotencyRecord({
        key: 'uuid-key-888',
        requestHash: 'hash-abc-123',
        statusCode: 201,
        responseBody: { success: true, message: 'Transferência ok' },
      });

      await idempotencyRepo.save(record);

      const found = await idempotencyRepo.findByKey('uuid-key-888');
      expect(found).not.toBeNull();
      expect(found.statusCode).toBe(201);
      expect(found.responseBody.message).toBe('Transferência ok');
    });
  });
});
