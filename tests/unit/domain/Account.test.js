const Account = require('../../../src/domain/entities/Account');
const Money = require('../../../src/domain/value-objects/Money');
const {
  InsufficientBalanceError,
  ValidationError,
} = require('../../../src/domain/errors/DomainErrors');

describe('Account Entity (Unit)', () => {
  const validAccountData = {
    accountNumber: '100200-1',
    holderName: 'Pedro Arthur Reis',
    documentNumber: '12345678900',
    balance: Money.fromDecimal(500.0),
  };

  it('deve instanciar uma conta válida com saldo inicial', () => {
    const account = new Account(validAccountData);

    expect(account.id).toBeDefined();
    expect(account.accountNumber).toBe('100200-1');
    expect(account.holderName).toBe('Pedro Arthur Reis');
    expect(account.documentNumber).toBe('12345678900');
    expect(account.balance.decimal).toBe(500.0);
    expect(account.status).toBe('ACTIVE');
  });

  it('deve creditar valor com sucesso na conta', () => {
    const account = new Account(validAccountData);
    const deposit = Money.fromDecimal(200.0);

    const newBalance = account.credit(deposit);

    expect(newBalance.decimal).toBe(700.0);
    expect(account.balance.decimal).toBe(700.0);
  });

  it('deve debitar valor quando o saldo for suficiente', () => {
    const account = new Account(validAccountData);
    const withdrawal = Money.fromDecimal(150.0);

    const newBalance = account.debit(withdrawal);

    expect(newBalance.decimal).toBe(350.0);
    expect(account.balance.decimal).toBe(350.0);
  });

  it('deve lançar InsufficientBalanceError quando o saldo for insuficiente', () => {
    const account = new Account(validAccountData);
    const withdrawal = Money.fromDecimal(600.0);

    expect(() => account.debit(withdrawal)).toThrow(InsufficientBalanceError);
    expect(account.balance.decimal).toBe(500.0); // Garante que o saldo não é alterado
  });

  it('deve lançar ValidationError se tentar movimentar valor zero ou negativo', () => {
    const account = new Account(validAccountData);

    expect(() => account.credit(Money.zero())).toThrow(ValidationError);
    expect(() => account.debit(Money.zero())).toThrow(ValidationError);
    expect(() => account.credit(null)).toThrow(ValidationError);
  });

  it('deve lançar ValidationError se tentar movimentar conta bloqueada ou inativa', () => {
    const account = new Account({ ...validAccountData, status: 'BLOCKED' });

    expect(() => account.credit(Money.fromDecimal(50))).toThrow(ValidationError);
    expect(() => account.debit(Money.fromDecimal(50))).toThrow(ValidationError);
  });

  it('deve validar campos obrigatórios no construtor', () => {
    expect(() => new Account({ ...validAccountData, accountNumber: '' })).toThrow(ValidationError);
    expect(() => new Account({ ...validAccountData, holderName: '   ' })).toThrow(ValidationError);
    expect(() => new Account({ ...validAccountData, documentNumber: null })).toThrow(ValidationError);
  });

  it('deve serializar a conta para JSON com os campos esperados', () => {
    const account = new Account(validAccountData);
    const json = account.toJSON();

    expect(json.accountNumber).toBe('100200-1');
    expect(json.balance).toBe(500.0);
    expect(json.status).toBe('ACTIVE');
    expect(json.createdAt).toBeDefined();
    expect(json.updatedAt).toBeDefined();
  });
});
