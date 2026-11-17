const { ValidationError } = require('../errors/DomainErrors');

class IdempotencyRecord {
  constructor({
    key,
    requestHash,
    statusCode,
    responseBody,
    createdAt = new Date(),
  }) {
    if (!key || typeof key !== 'string' || key.trim() === '') {
      throw new ValidationError('A chave de idempotência é obrigatória.');
    }
    this.key = key.trim();
    this.requestHash = requestHash || '';
    this.statusCode = statusCode || 200;
    this.responseBody = typeof responseBody === 'string' ? JSON.parse(responseBody) : responseBody;
    this.createdAt = createdAt instanceof Date ? createdAt : new Date(createdAt);
  }

  isMatchingRequest(requestHash) {
    if (!this.requestHash || !requestHash) return true;
    return this.requestHash === requestHash;
  }

  toJSON() {
    return {
      key: this.key,
      requestHash: this.requestHash,
      statusCode: this.statusCode,
      responseBody: this.responseBody,
      createdAt: this.createdAt.toISOString(),
    };
  }
}

module.exports = IdempotencyRecord;
