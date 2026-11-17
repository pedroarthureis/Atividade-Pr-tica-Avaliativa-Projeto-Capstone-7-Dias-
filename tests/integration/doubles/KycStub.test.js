const KycStub = require('./KycStub');

describe('KycStub Test Double (Integration)', () => {
  let stubGateway;

  beforeEach(() => {
    stubGateway = new KycStub();
  });

  it('deve fornecer dados fixos controlados para documento regular (Stub)', async () => {
    stubGateway.setValid(950);

    const result = await stubGateway.validateCustomerDocument('12345678900');

    expect(result.isValid).toBe(true);
    expect(result.status).toBe('REGULAR');
    expect(result.score).toBe(950);
    expect(result.sanctionCheckPassed).toBe(true);
  });

  it('deve fornecer dados fixos controlados para documento irregular/suspenso (Stub)', async () => {
    stubGateway.setInvalid('RECEITA_FEDERAL_CANCELADO');

    const result = await stubGateway.validateCustomerDocument('00000000000');

    expect(result.isValid).toBe(false);
    expect(result.status).toBe('RECEITA_FEDERAL_CANCELADO');
    expect(result.score).toBe(150);
  });
});
