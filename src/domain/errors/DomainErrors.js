class DomainError extends Error {
  constructor(message, code = 'DOMAIN_ERROR', statusCode = 400) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

class InsufficientBalanceError extends DomainError {
  constructor(message = 'Saldo insuficiente para realizar a operação.') {
    super(message, 'INSUFFICIENT_BALANCE', 422);
  }
}

class AccountNotFoundError extends DomainError {
  constructor(message = 'Conta não encontrada.') {
    super(message, 'ACCOUNT_NOT_FOUND', 404);
  }
}

class IdempotencyConflictError extends DomainError {
  constructor(message = 'Conflito de chave de idempotência com parâmetros divergentes.') {
    super(message, 'IDEMPOTENCY_CONFLICT', 409);
  }
}

class FraudDetectedError extends DomainError {
  constructor(message = 'Transação rejeitada pelo sistema de análise anti-fraude.') {
    super(message, 'FRAUD_DETECTED', 403);
  }
}

class ValidationError extends DomainError {
  constructor(message = 'Dados inválidos fornecidos.') {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

module.exports = {
  DomainError,
  InsufficientBalanceError,
  AccountNotFoundError,
  IdempotencyConflictError,
  FraudDetectedError,
  ValidationError,
};
