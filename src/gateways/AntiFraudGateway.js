class AntiFraudGateway {
  constructor(apiUrl = process.env.ANTI_FRAUD_GATEWAY_URL || 'https://fraud-gateway.internal.bank.com/v1/analyze') {
    this.apiUrl = apiUrl;
  }

  // Notificação e análise externa de anti-fraude via webhook/HTTP
  async analyzeTransfer({ transferId, sourceAccountId, destinationAccountId, amount, timestamp }) {
    // Simulação do gateway externo de produção
    const isSuspicious = amount > 10000.0;
    return {
      success: true,
      verdict: isSuspicious ? 'REJECTED' : 'APPROVED',
      riskScore: isSuspicious ? 0.95 : 0.05,
      notificationId: `fraud-notif-${Date.now()}`,
      analyzedAt: new Date().toISOString(),
      details: {
        transferId,
        sourceAccountId,
        destinationAccountId,
        amount,
        timestamp,
      },
    };
  }
}

module.exports = AntiFraudGateway;
