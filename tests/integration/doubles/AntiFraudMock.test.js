const AntiFraudMock = require('./AntiFraudMock');

describe('AntiFraudMock Test Double (Integration)', () => {
  let mockGateway;

  beforeEach(() => {
    mockGateway = new AntiFraudMock();
  });

  it('deve registrar chamadas e verificar contagem exata (Mock)', async () => {
    expect(mockGateway.callCount).toBe(0);

    await mockGateway.analyzeTransfer({
      transferId: 'tr-01',
      sourceAccountId: 'acc-src',
      destinationAccountId: 'acc-dst',
      amount: 150.0,
      timestamp: '2026-11-16T12:00:00Z',
    });

    expect(mockGateway.callCount).toBe(1);
    expect(() => mockGateway.verifyCalled(1)).not.toThrow();
    expect(() => mockGateway.verifyCalled(2)).toThrow();
  });

  it('deve validar parâmetros enviados para o serviço externo de anti-fraude', async () => {
    const payload = {
      transferId: 'tr-999',
      sourceAccountId: 'acc-1',
      destinationAccountId: 'acc-2',
      amount: 500.0,
    };

    await mockGateway.analyzeTransfer(payload);

    expect(() =>
      mockGateway.verifyCalledWith({
        transferId: 'tr-999',
        sourceAccountId: 'acc-1',
        destinationAccountId: 'acc-2',
        amount: 500.0,
      })
    ).not.toThrow();

    expect(() =>
      mockGateway.verifyCalledWith({
        transferId: 'tr-divergente',
      })
    ).toThrow(/Parâmetro 'transferId' divergente/);
  });

  it('deve permitir configurar o veredito para REJECTED e simular bloqueio de fraude', async () => {
    mockGateway.setVerdict('REJECTED', 0.98);

    const result = await mockGateway.analyzeTransfer({
      transferId: 'tr-suspicious',
      sourceAccountId: 'acc-1',
      destinationAccountId: 'acc-2',
      amount: 50000.0,
    });

    expect(result.verdict).toBe('REJECTED');
    expect(result.riskScore).toBe(0.98);
  });
});
