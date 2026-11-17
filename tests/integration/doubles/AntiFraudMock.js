class AntiFraudMock {
  constructor() {
    this.calls = [];
    this.defaultVerdict = 'APPROVED';
    this.defaultRiskScore = 0.05;
  }

  setVerdict(verdict, riskScore = 0.99) {
    this.defaultVerdict = verdict;
    this.defaultRiskScore = riskScore;
  }

  async analyzeTransfer(payload) {
    this.calls.push({
      timestamp: new Date(),
      payload: { ...payload },
    });

    return {
      success: true,
      verdict: this.defaultVerdict,
      riskScore: this.defaultRiskScore,
      notificationId: `mock-notif-${this.calls.length}`,
      analyzedAt: new Date().toISOString(),
    };
  }

  get callCount() {
    return this.calls.length;
  }

  getLastCall() {
    if (this.calls.length === 0) return null;
    return this.calls[this.calls.length - 1];
  }

  verifyCalled(expectedCount) {
    if (this.calls.length !== expectedCount) {
      throw new Error(
        `[AntiFraudMock] Esperado ${expectedCount} chamadas, mas foram registradas ${this.calls.length}.`
      );
    }
    return true;
  }

  verifyCalledWith(expectedParams) {
    const lastCall = this.getLastCall();
    if (!lastCall) {
      throw new Error('[AntiFraudMock] Nenhuma chamada foi registrada.');
    }

    for (const [key, expectedVal] of Object.entries(expectedParams)) {
      if (lastCall.payload[key] !== expectedVal) {
        throw new Error(
          `[AntiFraudMock] Parâmetro '${key}' divergente. Esperado: ${expectedVal}, Recebido: ${lastCall.payload[key]}`
        );
      }
    }
    return true;
  }

  reset() {
    this.calls = [];
    this.defaultVerdict = 'APPROVED';
    this.defaultRiskScore = 0.05;
  }
}

module.exports = AntiFraudMock;
