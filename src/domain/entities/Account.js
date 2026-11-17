const { v4: uuidv4 } = require('uuid');
const Money = require('../value-objects/Money');
const { InsufficientBalanceError, ValidationError } = require('../errors/DomainErrors');

class Account {
  constructor({
    id = uuidv4(),
    accountNumber,
    holderName,
    documentNumber,
    balance = Money.zero(),
    status = 'ACTIVE',
    createdAt = new Date(),
    updatedAt = new Date(),
  }) {
    if (!accountNumber || typeof accountNumber !== 'string' || accountNumber.trim() === '') {
      throw new ValidationError('O número da conta é obrigatório.');
    }
    if (!holderName || typeof holderName !== 'string' || holderName.trim() === '') {
      throw new ValidationError('O nome do titular é obrigatório.');
    }
    if (!documentNumber || typeof documentNumber !== 'string' || documentNumber.trim() === '') {
      throw new ValidationError('O documento do titular é obrigatório.');
    }

    this.id = id;
    this.accountNumber = accountNumber.trim();
    this.holderName = holderName.trim();
    this.documentNumber = documentNumber.trim();
    this.balance = balance instanceof Money ? balance : Money.fromDecimal(Number(balance));
    this.status = status;
    this.createdAt = createdAt instanceof Date ? createdAt : new Date(createdAt);
    this.updatedAt = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);
  }

  credit(money) {
    this._validateActive();
    this._validatePositiveMoney(money);
    this.balance = this.balance.add(money);
    this.updatedAt = new Date();
    return this.balance;
  }

  debit(money) {
    this._validateActive();
    this._validatePositiveMoney(money);
    if (!this.hasSufficientBalance(money)) {
      throw new InsufficientBalanceError(
        `Saldo insuficiente. Saldo atual: ${this.balance.toString()}, valor solicitado: ${money.toString()}`
      );
    }
    this.balance = this.balance.subtract(money);
    this.updatedAt = new Date();
    return this.balance;
  }

  hasSufficientBalance(money) {
    return this.balance.isGreaterThanOrEqual(money);
  }

  _validateActive() {
    if (this.status !== 'ACTIVE') {
      throw new ValidationError(`Conta inativa ou bloqueada: ${this.status}`);
    }
  }

  _validatePositiveMoney(money) {
    if (!(money instanceof Money) || money.isZero()) {
      throw new ValidationError('O valor da movimentação deve ser maior que zero.');
    }
  }

  toJSON() {
    return {
      id: this.id,
      accountNumber: this.accountNumber,
      holderName: this.holderName,
      documentNumber: this.documentNumber,
      balance: this.balance.decimal,
      status: this.status,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}

module.exports = Account;
