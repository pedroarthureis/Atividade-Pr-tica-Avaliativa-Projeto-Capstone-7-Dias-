const Account = require('../domain/entities/Account');
const { Transaction, TransactionType } = require('../domain/entities/Transaction');
const Money = require('../domain/value-objects/Money');
const {
  AccountNotFoundError,
  ValidationError,
} = require('../domain/errors/DomainErrors');

class AccountService {
  constructor({ accountRepository, transactionRepository, kycGateway, dbConnection }) {
    this.accountRepository = accountRepository;
    this.transactionRepository = transactionRepository;
    this.kycGateway = kycGateway;
    this.db = dbConnection;
  }

  async createAccount({ accountNumber, holderName, documentNumber, initialBalance = 0.0 }) {
    if (!accountNumber || !holderName || !documentNumber) {
      throw new ValidationError('Todos os campos obrigatórios devem ser preenchidos.');
    }

    const existingAccount = await this.accountRepository.findByAccountNumber(accountNumber);
    if (existingAccount) {
      throw new ValidationError(`Já existe uma conta cadastrada com o número ${accountNumber}.`);
    }

    const existingDoc = await this.accountRepository.findByDocumentNumber(documentNumber);
    if (existingDoc) {
      throw new ValidationError('Já existe uma conta associada a este documento cadastral.');
    }

    // Validação cadastral externa via Stub / Gateway de Compliance
    if (this.kycGateway) {
      const kycResult = await this.kycGateway.validateCustomerDocument(documentNumber);
      if (!kycResult || !kycResult.isValid) {
        throw new ValidationError(
          `Documento rejeitado na validação cadastral (KYC): ${kycResult ? kycResult.status : 'Falha desconhecida'}.`
        );
      }
    }

    const initialMoney = Money.fromDecimal(Number(initialBalance));

    const account = new Account({
      accountNumber,
      holderName,
      documentNumber,
      balance: initialMoney,
    });

    await this.accountRepository.create(account);

    if (!initialMoney.isZero() && this.transactionRepository) {
      const initialTx = new Transaction({
        accountId: account.id,
        type: TransactionType.CREDIT,
        amount: initialMoney,
        balanceAfter: initialMoney,
        description: 'Depósito de abertura de conta digital',
      });
      await this.transactionRepository.create(initialTx);
    }

    return account;
  }

  async getAccountById(id) {
    const account = await this.accountRepository.findById(id);
    if (!account) {
      throw new AccountNotFoundError(`Conta com ID ${id} não foi encontrada.`);
    }
    return account;
  }

  async getAccountByNumber(accountNumber) {
    const account = await this.accountRepository.findByAccountNumber(accountNumber);
    if (!account) {
      throw new AccountNotFoundError(`Conta número ${accountNumber} não foi encontrada.`);
    }
    return account;
  }
}

module.exports = AccountService;
