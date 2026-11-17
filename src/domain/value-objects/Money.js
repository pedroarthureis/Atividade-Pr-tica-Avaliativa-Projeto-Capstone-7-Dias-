const { ValidationError } = require('../errors/DomainErrors');

class Money {
  constructor(amountInCents) {
    if (!Number.isInteger(amountInCents)) {
      throw new ValidationError('O valor monetário em centavos deve ser um número inteiro.');
    }
    if (amountInCents < 0) {
      throw new ValidationError('O valor monetário não pode ser negativo.');
    }
    this._cents = amountInCents;
    Object.freeze(this);
  }

  static fromDecimal(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) {
      throw new ValidationError('O valor monetário deve ser um número válido.');
    }
    if (amount < 0) {
      throw new ValidationError('O valor monetário não pode ser negativo.');
    }
    const cents = Math.round(amount * 100);
    return new Money(cents);
  }

  static zero() {
    return new Money(0);
  }

  get cents() {
    return this._cents;
  }

  get decimal() {
    return Number((this._cents / 100).toFixed(2));
  }

  add(other) {
    this._validateMoneyInstance(other);
    return new Money(this._cents + other.cents);
  }

  subtract(other) {
    this._validateMoneyInstance(other);
    if (this._cents < other.cents) {
      throw new ValidationError('O saldo resultante não pode ser negativo.');
    }
    return new Money(this._cents - other.cents);
  }

  isGreaterThan(other) {
    this._validateMoneyInstance(other);
    return this._cents > other.cents;
  }

  isGreaterThanOrEqual(other) {
    this._validateMoneyInstance(other);
    return this._cents >= other.cents;
  }

  isLessThan(other) {
    this._validateMoneyInstance(other);
    return this._cents < other.cents;
  }

  isZero() {
    return this._cents === 0;
  }

  equals(other) {
    if (!(other instanceof Money)) return false;
    return this._cents === other.cents;
  }

  _validateMoneyInstance(other) {
    if (!(other instanceof Money)) {
      throw new ValidationError('Operação monetária requer outra instância de Money.');
    }
  }

  toJSON() {
    return this.decimal;
  }

  toString() {
    return `R$ ${this.decimal.toFixed(2)}`;
  }
}

module.exports = Money;
