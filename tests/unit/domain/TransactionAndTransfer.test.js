const { Transaction, TransactionType } = require('../../../src/domain/entities/Transaction');
const { Transfer, TransferStatus } = require('../../../src/domain/entities/Transfer');
const Money = require('../../../src/domain/value-objects/Money');
const { ValidationError } = require('../../../src/domain/errors/DomainErrors');

describe('Transaction Entity (Unit)', () => {
  it('deve instanciar uma transação válida do tipo CREDIT', () => {
    const tx = new Transaction({
      accountId: 'acc-1',
      type: TransactionType.CREDIT,
      amount: Money.fromDecimal(100.0),
      balanceAfter: Money.fromDecimal(600.0),
      description: 'Depósito inicial',
    });

    expect(tx.id).toBeDefined();
    expect(tx.type).toBe('CREDIT');
    expect(tx.amount.decimal).toBe(100.0);
    expect(tx.balanceAfter.decimal).toBe(600.0);
  });

  it('deve instanciar uma transação válida do tipo DEBIT', () => {
    const tx = new Transaction({
      accountId: 'acc-1',
      type: TransactionType.DEBIT,
      amount: Money.fromDecimal(50.0),
      balanceAfter: Money.fromDecimal(550.0),
      description: 'Transferência Pix enviada',
    });

    expect(tx.type).toBe('DEBIT');
    expect(tx.amount.decimal).toBe(50.0);
  });

  it('deve lançar ValidationError se accountId ou tipo forem inválidos', () => {
    expect(() => new Transaction({
      accountId: '',
      type: 'CREDIT',
      amount: Money.fromDecimal(10),
      balanceAfter: Money.fromDecimal(10),
    })).toThrow(ValidationError);

    expect(() => new Transaction({
      accountId: 'acc-1',
      type: 'INVALID_TYPE',
      amount: Money.fromDecimal(10),
      balanceAfter: Money.fromDecimal(10),
    })).toThrow(ValidationError);
  });
});

describe('Transfer Entity (Unit)', () => {
  it('deve criar uma transferência válida em estado PENDING', () => {
    const transfer = new Transfer({
      sourceAccountId: 'acc-origin',
      destinationAccountId: 'acc-dest',
      amount: Money.fromDecimal(150.0),
      idempotencyKey: 'key-123',
    });

    expect(transfer.id).toBeDefined();
    expect(transfer.status).toBe(TransferStatus.PENDING);
    expect(transfer.amount.decimal).toBe(150.0);
    expect(transfer.idempotencyKey).toBe('key-123');
  });

  it('deve transicionar status para COMPLETED, FAILED e REJECTED', () => {
    const transfer = new Transfer({
      sourceAccountId: 'acc-origin',
      destinationAccountId: 'acc-dest',
      amount: Money.fromDecimal(100.0),
    });

    transfer.complete();
    expect(transfer.status).toBe(TransferStatus.COMPLETED);

    transfer.fail('Erro de timeout');
    expect(transfer.status).toBe(TransferStatus.FAILED);
    expect(transfer.reason).toBe('Erro de timeout');

    transfer.reject('Suspeita de fraude');
    expect(transfer.status).toBe(TransferStatus.REJECTED);
    expect(transfer.reason).toBe('Suspeita de fraude');
  });

  it('deve lançar ValidationError se contas de origem e destino forem idênticas', () => {
    expect(() => new Transfer({
      sourceAccountId: 'acc-same',
      destinationAccountId: 'acc-same',
      amount: Money.fromDecimal(50.0),
    })).toThrow(ValidationError);
  });

  it('deve lançar ValidationError se o valor da transferência for zero ou negativo', () => {
    expect(() => new Transfer({
      sourceAccountId: 'acc-1',
      destinationAccountId: 'acc-2',
      amount: Money.zero(),
    })).toThrow(ValidationError);
  });
});
