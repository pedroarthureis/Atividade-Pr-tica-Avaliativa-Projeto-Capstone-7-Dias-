const { DatabaseConnection } = require('../../../src/database/DatabaseConnection');
const SqliteAccountRepository = require('../../../src/repositories/SqliteAccountRepository');
const SqliteTransactionRepository = require('../../../src/repositories/SqliteTransactionRepository');
const SqliteIdempotencyRepository = require('../../../src/repositories/SqliteIdempotencyRepository');
const TransferService = require('../../../src/services/TransferService');
const Account = require('../../../src/domain/entities/Account');
const Money = require('../../../src/domain/value-objects/Money');
const AntiFraudMock = require('../doubles/AntiFraudMock');
const {
  InsufficientBalanceError,
  IdempotencyConflictError,
  FraudDetectedError,
} = require('../../../src/domain/errors/DomainErrors');

describe('TransferService Integration with SQLite In-Memory & AntiFraud Mock', () => {
  let dbConnection;
  let accountRepo;
  let transactionRepo;
  let idempotencyRepo;
  let antiFraudMock;
  let transferService;
  let originAccount;
  let destAccount;

  beforeEach(async () => {
    dbConnection = new DatabaseConnection();
    await dbConnection.initialize();

    accountRepo = new SqliteAccountRepository(dbConnection);
    transactionRepo = new SqliteTransactionRepository(dbConnection);
    idempotencyRepo = new SqliteIdempotencyRepository(dbConnection);
    antiFraudMock = new AntiFraudMock();

    transferService = new TransferService({
      accountRepository: accountRepo,
      transactionRepository: transactionRepo,
      idempotencyRepository: idempotencyRepo,
      antiFraudGateway: antiFraudMock,
      dbConnection,
    });

    originAccount = new Account({
      accountNumber: '1001-0',
      holderName: 'Alice Origem',
      documentNumber: '11111111100',
      balance: Money.fromDecimal(1000.0),
    });

    destAccount = new Account({
      accountNumber: '2002-0',
      holderName: 'Bob Destino',
      documentNumber: '22222222200',
      balance: Money.fromDecimal(200.0),
    });

    await accountRepo.create(originAccount);
    await accountRepo.create(destAccount);
  });

  afterEach(async () => {
    await dbConnection.close();
  });

  it('deve executar transferência com sucesso e acionar Mock de Anti-Fraude verificando contagem e parâmetros', async () => {
    const result = await transferService.executeTransfer({
      sourceAccountId: originAccount.id,
      destinationAccountId: destAccount.id,
      amount: 350.0,
      idempotencyKey: 'idemp-tx-1',
    });

    expect(result.status).toBe('COMPLETED');
    expect(result.amount).toBe(350.0);
    expect(result.sourceBalanceAfter).toBe(650.0);

    // Verificação mandante do MOCK (interação de saída)
    expect(antiFraudMock.callCount).toBe(1);
    antiFraudMock.verifyCalledWith({
      sourceAccountId: originAccount.id,
      destinationAccountId: destAccount.id,
      amount: 350.0,
    });

    // Validação de persistência no banco em memória
    const updatedOrigin = await accountRepo.findById(originAccount.id);
    const updatedDest = await accountRepo.findById(destAccount.id);
    expect(updatedOrigin.balance.decimal).toBe(650.0);
    expect(updatedDest.balance.decimal).toBe(550.0);

    // Validação dos registros no extrato contábil
    const originTransactions = await transactionRepo.findByAccountId(originAccount.id);
    const destTransactions = await transactionRepo.findByAccountId(destAccount.id);
    expect(originTransactions.length).toBe(1);
    expect(originTransactions[0].type).toBe('DEBIT');
    expect(destTransactions.length).toBe(1);
    expect(destTransactions[0].type).toBe('CREDIT');
  });

  it('deve abortar transferência e lançar FraudDetectedError se o Mock de anti-fraude rejeitar', async () => {
    antiFraudMock.setVerdict('REJECTED', 0.99);

    await expect(
      transferService.executeTransfer({
        sourceAccountId: originAccount.id,
        destinationAccountId: destAccount.id,
        amount: 100.0,
        idempotencyKey: 'idemp-fraud-1',
      })
    ).rejects.toThrow(FraudDetectedError);

    // Verifica que o saldo não foi debitado (Atomicidade/Rollback)
    const updatedOrigin = await accountRepo.findById(originAccount.id);
    const updatedDest = await accountRepo.findById(destAccount.id);
    expect(updatedOrigin.balance.decimal).toBe(1000.0);
    expect(updatedDest.balance.decimal).toBe(200.0);
  });

  it('deve respeitar idempotência retornando a mesma resposta sem reprocessar saldo', async () => {
    const firstCall = await transferService.executeTransfer({
      sourceAccountId: originAccount.id,
      destinationAccountId: destAccount.id,
      amount: 200.0,
      idempotencyKey: 'repeatable-key-777',
    });

    expect(firstCall.isIdempotentReplay).toBe(false);
    expect(firstCall.sourceBalanceAfter).toBe(800.0);
    expect(antiFraudMock.callCount).toBe(1);

    // Segunda chamada com a mesma chave
    const secondCall = await transferService.executeTransfer({
      sourceAccountId: originAccount.id,
      destinationAccountId: destAccount.id,
      amount: 200.0,
      idempotencyKey: 'repeatable-key-777',
    });

    expect(secondCall.isIdempotentReplay).toBe(true);
    expect(secondCall.transferId).toBe(firstCall.transferId);
    expect(antiFraudMock.callCount).toBe(1); // Não chamou o mock novamente!

    // Saldo permaneceu debitado uma única vez
    const updatedOrigin = await accountRepo.findById(originAccount.id);
    expect(updatedOrigin.balance.decimal).toBe(800.0);
  });

  it('deve lançar IdempotencyConflictError ao reenviar mesma chave com valor divergente', async () => {
    await transferService.executeTransfer({
      sourceAccountId: originAccount.id,
      destinationAccountId: destAccount.id,
      amount: 100.0,
      idempotencyKey: 'key-conflict-test',
    });

    await expect(
      transferService.executeTransfer({
        sourceAccountId: originAccount.id,
        destinationAccountId: destAccount.id,
        amount: 250.0, // Valor divergente!
        idempotencyKey: 'key-conflict-test',
      })
    ).rejects.toThrow(IdempotencyConflictError);
  });

  it('deve lançar InsufficientBalanceError quando saldo for menor que a transferência', async () => {
    await expect(
      transferService.executeTransfer({
        sourceAccountId: originAccount.id,
        destinationAccountId: destAccount.id,
        amount: 5000.0,
      })
    ).rejects.toThrow(InsufficientBalanceError);

    // O Mock de anti-fraude nem deve ser acionado se o saldo for insuficiente
    expect(antiFraudMock.callCount).toBe(0);
  });

  it('deve tratar concorrência de transferências simultâneas sem inconsistência de saldo (Mutex Lock)', async () => {
    // 5 transferências concorrentes de 200.0 cada a partir de uma conta com 1000.0
    // Total a ser debitado = 1000.0, saldo final deve ser exatamente 0.0
    const promises = Array.from({ length: 5 }, (_, idx) =>
      transferService.executeTransfer({
        sourceAccountId: originAccount.id,
        destinationAccountId: destAccount.id,
        amount: 200.0,
        idempotencyKey: `concurrent-key-${idx}`,
      })
    );

    const results = await Promise.all(promises);
    expect(results.length).toBe(5);

    const finalOrigin = await accountRepo.findById(originAccount.id);
    const finalDest = await accountRepo.findById(destAccount.id);

    expect(finalOrigin.balance.decimal).toBe(0.0);
    expect(finalDest.balance.decimal).toBe(1200.0);
    expect(antiFraudMock.callCount).toBe(5);
  });
});
