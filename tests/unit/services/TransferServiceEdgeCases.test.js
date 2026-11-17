const TransferService = require('../../../src/services/TransferService');
const AntiFraudGateway = require('../../../src/gateways/AntiFraudGateway');
const KycGateway = require('../../../src/gateways/KycGateway');
const errorHandler = require('../../../src/middlewares/errorHandler');
const IdempotencyRecord = require('../../../src/domain/value-objects/IdempotencyRecord');
const {
  ValidationError,
  AccountNotFoundError,
  IdempotencyConflictError,
} = require('../../../src/domain/errors/DomainErrors');

describe('TransferService Edge Cases & Branch Coverage (Unit)', () => {
  let mockAccountRepo;
  let mockTxRepo;
  let mockIdempRepo;
  let mockDb;
  let transferService;

  beforeEach(() => {
    mockAccountRepo = {
      findById: jest.fn(),
      updateBalance: jest.fn(),
    };
    mockTxRepo = {
      saveTransfer: jest.fn(),
      create: jest.fn(),
    };
    mockIdempRepo = {
      findByKey: jest.fn(),
      save: jest.fn(),
    };
    mockDb = {
      withLock: jest.fn(async (fn) => fn()),
    };
    transferService = new TransferService({
      accountRepository: mockAccountRepo,
      transactionRepository: mockTxRepo,
      idempotencyRepository: mockIdempRepo,
      dbConnection: mockDb,
    });
  });

  it('deve lançar ValidationError se contas de origem ou destino forem nulas', async () => {
    await expect(transferService.executeTransfer({ sourceAccountId: '', destinationAccountId: '2', amount: 10 })).rejects.toThrow(ValidationError);
    await expect(transferService.executeTransfer({ sourceAccountId: '1', destinationAccountId: '', amount: 10 })).rejects.toThrow(ValidationError);
    await expect(transferService.executeTransfer({ sourceAccountId: '1', destinationAccountId: '1', amount: 10 })).rejects.toThrow(ValidationError);
  });

  it('deve lançar AccountNotFoundError se conta de origem ou destino não existirem no banco', async () => {
    mockAccountRepo.findById.mockResolvedValueOnce(null);
    await expect(
      transferService.executeTransfer({ sourceAccountId: 'missing-src', destinationAccountId: 'dest', amount: 50 })
    ).rejects.toThrow(AccountNotFoundError);

    mockAccountRepo.findById
      .mockResolvedValueOnce({ id: 'src', status: 'ACTIVE', debit: jest.fn(), balance: { decimal: 100 } })
      .mockResolvedValueOnce(null);

    await expect(
      transferService.executeTransfer({ sourceAccountId: 'src', destinationAccountId: 'missing-dst', amount: 50 })
    ).rejects.toThrow(AccountNotFoundError);
  });

  it('deve lançar IdempotencyConflictError se double check dentro do lock detectar chave divergente', async () => {
    mockIdempRepo.findByKey
      .mockResolvedValueOnce(null) // primeiro check passa
      .mockResolvedValueOnce({ isMatchingRequest: () => false }); // double check detecta conflito

    await expect(
      transferService.executeTransfer({
        sourceAccountId: 'src',
        destinationAccountId: 'dst',
        amount: 50,
        idempotencyKey: 'race-key',
      })
    ).rejects.toThrow(IdempotencyConflictError);
  });

  it('deve retornar replay de idempotência se double check encontrar chave correspondente', async () => {
    mockIdempRepo.findByKey
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        isMatchingRequest: () => true,
        responseBody: { transferId: 'cached-id', status: 'COMPLETED' },
      });

    const result = await transferService.executeTransfer({
      sourceAccountId: 'src',
      destinationAccountId: 'dst',
      amount: 50,
      idempotencyKey: 'race-key-match',
    });

    expect(result.isIdempotentReplay).toBe(true);
    expect(result.transferId).toBe('cached-id');
  });
});

describe('Gateway and Middleware Branches (Unit)', () => {
  it('AntiFraudGateway deve retornar REJECTED para valores altos', async () => {
    const gateway = new AntiFraudGateway();
    const approved = await gateway.analyzeTransfer({ transferId: '1', amount: 100 });
    const rejected = await gateway.analyzeTransfer({ transferId: '2', amount: 15000 });

    expect(approved.verdict).toBe('APPROVED');
    expect(rejected.verdict).toBe('REJECTED');
  });

  it('KycGateway deve validar documento nulo e regular', async () => {
    const gateway = new KycGateway();
    const invalid = await gateway.validateCustomerDocument('');
    const valid = await gateway.validateCustomerDocument('12345678900');

    expect(invalid.isValid).toBe(false);
    expect(valid.isValid).toBe(true);
  });

  it('errorHandler deve tratar erros não-DomainError como 500', () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const genericError = new Error('Erro inesperado no servidor');

    errorHandler(genericError, {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'INTERNAL_SERVER_ERROR',
        }),
      })
    );
  });

  it('IdempotencyRecord deve validar matching sem hash ou com hash correto', () => {
    const record = new IdempotencyRecord({
      key: 'key-1',
      requestHash: '',
      statusCode: 200,
      responseBody: { ok: true },
    });
    expect(record.isMatchingRequest('any-hash')).toBe(true);
  });
});
