const Money = require('../../../src/domain/value-objects/Money');
const { ValidationError } = require('../../../src/domain/errors/DomainErrors');

describe('Money Value Object (Unit)', () => {
  it('deve criar uma instância a partir de centavos inteiros', () => {
    const money = new Money(1500);
    expect(money.cents).toBe(1500);
    expect(money.decimal).toBe(15.0);
  });

  it('deve criar uma instância a partir de valor decimal', () => {
    const money = Money.fromDecimal(99.95);
    expect(money.cents).toBe(9995);
    expect(money.decimal).toBe(99.95);
  });

  it('deve somar dois valores monetários com exatidão', () => {
    const m1 = Money.fromDecimal(10.5);
    const m2 = Money.fromDecimal(20.35);
    const sum = m1.add(m2);

    expect(sum.decimal).toBe(30.85);
    expect(sum.cents).toBe(3085);
  });

  it('deve subtrair dois valores monetários corretamente', () => {
    const m1 = Money.fromDecimal(50.0);
    const m2 = Money.fromDecimal(19.99);
    const diff = m1.subtract(m2);

    expect(diff.decimal).toBe(30.01);
  });

  it('deve lançar ValidationError ao tentar subtrair valor maior que o existente', () => {
    const m1 = Money.fromDecimal(10.0);
    const m2 = Money.fromDecimal(20.0);

    expect(() => m1.subtract(m2)).toThrow(ValidationError);
  });

  it('deve lançar ValidationError ao criar Money com centavos não inteiros ou negativos', () => {
    expect(() => new Money(10.5)).toThrow(ValidationError);
    expect(() => new Money(-100)).toThrow(ValidationError);
  });

  it('deve lançar ValidationError para valor decimal negativo ou inválido', () => {
    expect(() => Money.fromDecimal(-50)).toThrow(ValidationError);
    expect(() => Money.fromDecimal(NaN)).toThrow(ValidationError);
  });

  it('deve comparar valores monetários corretamente (greater, less, equal, zero)', () => {
    const m1 = Money.fromDecimal(100.0);
    const m2 = Money.fromDecimal(50.0);
    const m3 = Money.fromDecimal(100.0);
    const mZero = Money.zero();

    expect(m1.isGreaterThan(m2)).toBe(true);
    expect(m2.isLessThan(m1)).toBe(true);
    expect(m1.isGreaterThanOrEqual(m3)).toBe(true);
    expect(m1.equals(m3)).toBe(true);
    expect(m1.equals(m2)).toBe(false);
    expect(m1.equals(null)).toBe(false);
    expect(mZero.isZero()).toBe(true);
  });

  it('deve formatar corretamente para JSON e String', () => {
    const m = Money.fromDecimal(250.75);
    expect(m.toJSON()).toBe(250.75);
    expect(m.toString()).toBe('R$ 250.75');
  });
});
