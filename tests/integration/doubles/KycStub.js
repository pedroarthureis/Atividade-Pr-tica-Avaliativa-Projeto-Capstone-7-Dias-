class KycStub {
  constructor() {
    this.configuredResponse = {
      isValid: true,
      status: 'REGULAR',
      score: 900,
      sanctionCheckPassed: true,
    };
  }

  setValid(score = 900) {
    this.configuredResponse = {
      isValid: true,
      status: 'REGULAR',
      score,
      sanctionCheckPassed: true,
    };
  }

  setInvalid(reason = 'CPF_SUSPENDED') {
    this.configuredResponse = {
      isValid: false,
      status: reason,
      score: 150,
      sanctionCheckPassed: false,
    };
  }

  async validateCustomerDocument(_documentNumber) {
    // Retorna dados estáticos previamente configurados (Stub) sem chamada de rede
    return { ...this.configuredResponse };
  }
}

module.exports = KycStub;
