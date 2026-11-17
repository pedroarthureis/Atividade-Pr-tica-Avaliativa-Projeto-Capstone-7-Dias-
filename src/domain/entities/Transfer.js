const { v4: uuidv4 } = require('uuid');
const Money = require('../value-objects/Money');
const { ValidationError } = require('../errors/DomainErrors');

const TransferStatus = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REJECTED: 'REJECTED',
};

class Transfer {
  constructor({
    id = uuidv4(),
    sourceAccountId,
    destinationAccountId,
    amount,
    status = TransferStatus.PENDING,
    idempotencyKey = null,
    reason = '',
    createdAt = new Date(),
  }) {
    if (!sourceAccountId) {
      throw new ValidationError('A conta de origem é obrigatória.');
    }
    if (!destinationAccountId) {
      throw new ValidationError('A conta de destino é obrigatória.');
    }
    if (sourceAccountId === destinationAccountId) {
      throw new ValidationError('A conta de origem e destino não podem ser iguais.');
    }

    const transferAmount = amount instanceof Money ? amount : Money.fromDecimal(Number(amount));
    if (transferAmount.isZero()) {
      throw new ValidationError('O valor da transferência deve ser maior que zero.');
    }

    this.id = id;
    this.sourceAccountId = sourceAccountId;
    this.destinationAccountId = destinationAccountId;
    this.amount = transferAmount;
    this.status = status;
    this.idempotencyKey = idempotencyKey;
    this.reason = reason;
    this.createdAt = createdAt instanceof Date ? createdAt : new Date(createdAt);
  }

  complete() {
    this.status = TransferStatus.COMPLETED;
  }

  fail(reason = '') {
    this.status = TransferStatus.FAILED;
    this.reason = reason;
  }

  reject(reason = '') {
    this.status = TransferStatus.REJECTED;
    this.reason = reason;
  }

  toJSON() {
    return {
      id: this.id,
      sourceAccountId: this.sourceAccountId,
      destinationAccountId: this.destinationAccountId,
      amount: this.amount.decimal,
      status: this.status,
      idempotencyKey: this.idempotencyKey,
      reason: this.reason,
      createdAt: this.createdAt.toISOString(),
    };
  }
}

module.exports = {
  Transfer,
  TransferStatus,
};
