const { v4: uuidv4 } = require('uuid');
const Money = require('../value-objects/Money');
const { ValidationError } = require('../errors/DomainErrors');

const TransactionType = {
  CREDIT: 'CREDIT',
  DEBIT: 'DEBIT',
};

class Transaction {
  constructor({
    id = uuidv4(),
    accountId,
    type,
    amount,
    balanceAfter,
    description = '',
    referenceId = null,
    createdAt = new Date(),
  }) {
    if (!accountId) {
      throw new ValidationError('O ID da conta vinculada é obrigatório.');
    }
    if (!type || ![TransactionType.CREDIT, TransactionType.DEBIT].includes(type)) {
      throw new ValidationError(`Tipo de transação inválido: ${type}. Esperado: CREDIT ou DEBIT.`);
    }

    this.id = id;
    this.accountId = accountId;
    this.type = type;
    this.amount = amount instanceof Money ? amount : Money.fromDecimal(Number(amount));
    this.balanceAfter = balanceAfter instanceof Money ? balanceAfter : Money.fromDecimal(Number(balanceAfter));
    this.description = description;
    this.referenceId = referenceId;
    this.createdAt = createdAt instanceof Date ? createdAt : new Date(createdAt);
  }

  toJSON() {
    return {
      id: this.id,
      accountId: this.accountId,
      type: this.type,
      amount: this.amount.decimal,
      balanceAfter: this.balanceAfter.decimal,
      description: this.description,
      referenceId: this.referenceId,
      createdAt: this.createdAt.toISOString(),
    };
  }
}

module.exports = {
  Transaction,
  TransactionType,
};
