const AccountService = require('../../../src/services/AccountService');
const { ValidationError, AccountNotFoundError } = require('../../../src/domain/errors/DomainErrors');

describe('AccountService Edge Cases & Branch Coverage (Unit)', () => {
  let mockAccountRepo;
  let mockTxRepo;
  let mockKyc;
  let accountService;

  beforeEach(() => {
    mockAccountRepo = {
      findByAccountNumber: jest.fn(),
      findByDocumentNumber: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };
    mockTxRepo = {
      create: jest.fn(),
    };
    mockKyc = {
      validateCustomerDocument: jest.fn(),
    };
    accountService = new AccountService({
      accountRepository: mockAccountRepo,
      transactionRepository: mockTxRepo,
      kycGateway: mockKyc,
    });
  });

  it('deve lançar ValidationError se campos obrigatórios estiverem ausentes', async () => {
    await expect(accountService.createAccount({ accountNumber: '' })).rejects.toThrow(ValidationError);
    await expect(accountService.createAccount({ accountNumber: '1', holderName: '' })).rejects.toThrow(ValidationError);
    await expect(accountService.createAccount({ accountNumber: '1', holderName: 'A', documentNumber: '' })).rejects.toThrow(ValidationError);
  });

  it('deve lançar ValidationError se já existir conta com o mesmo documento', async () => {
    mockAccountRepo.findByAccountNumber.mockResolvedValue(null);
    mockAccountRepo.findByDocumentNumber.mockResolvedValue({ id: 'existing' });

    await expect(
      accountService.createAccount({
        accountNumber: '123',
        holderName: 'Teste',
        documentNumber: '999',
      })
    ).rejects.toThrow(/Já existe uma conta associada a este documento/);
  });

  it('deve lançar ValidationError se validação KYC retornar null ou inválido', async () => {
    mockAccountRepo.findByAccountNumber.mockResolvedValue(null);
    mockAccountRepo.findByDocumentNumber.mockResolvedValue(null);
    mockKyc.validateCustomerDocument.mockResolvedValue(null);

    await expect(
      accountService.createAccount({
        accountNumber: '123',
        holderName: 'Teste',
        documentNumber: '999',
      })
    ).rejects.toThrow(/Documento rejeitado na validação cadastral/);
  });

  it('deve lançar AccountNotFoundError em getAccountById e getAccountByNumber para contas inexistentes', async () => {
    mockAccountRepo.findById.mockResolvedValue(null);
    mockAccountRepo.findByAccountNumber.mockResolvedValue(null);

    await expect(accountService.getAccountById('non-existent')).rejects.toThrow(AccountNotFoundError);
    await expect(accountService.getAccountByNumber('non-existent')).rejects.toThrow(AccountNotFoundError);
  });
});
