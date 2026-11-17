const crypto = require('crypto');
const { Transfer } = require('../domain/entities/Transfer');
const { Transaction, TransactionType } = require('../domain/entities/Transaction');
const IdempotencyRecord = require('../domain/value-objects/IdempotencyRecord');
const Money = require('../domain/value-objects/Money');
const {
  AccountNotFoundError,
  IdempotencyConflictError,
  FraudDetectedError,
  ValidationError,
} = require('../domain/errors/DomainErrors');

class TransferService {
  constructor({
    accountRepository,
    transactionRepository,
    idempotencyRepository,
    antiFraudGateway,
    dbConnection,
  }) {
    this.accountRepository = accountRepository;
    this.transactionRepository = transactionRepository;
    this.idempotencyRepository = idempotencyRepository;
    this.antiFraudGateway = antiFraudGateway;
    this.db = dbConnection;
  }

  _computeRequestHash(sourceAccountId, destinationAccountId, amount) {
    const raw = `${sourceAccountId}:${destinationAccountId}:${Number(amount).toFixed(2)}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  async executeTransfer({
    sourceAccountId,
    destinationAccountId,
    amount,
    idempotencyKey = null,
  }) {
    if (!sourceAccountId || !destinationAccountId) {
      throw new ValidationError('Contas de origem e destino são obrigatórias.');
    }
    if (sourceAccountId === destinationAccountId) {
      throw new ValidationError('A conta de origem e destino não podem ser iguais.');
    }

    const transferMoney = Money.fromDecimal(Number(amount));
    if (transferMoney.isZero()) {
      throw new ValidationError('O valor da transferência deve ser maior que zero.');
    }

    const requestHash = this._computeRequestHash(sourceAccountId, destinationAccountId, amount);

    // 1. Verificação de Idempotência
    if (idempotencyKey && this.idempotencyRepository) {
      const existingRecord = await this.idempotencyRepository.findByKey(idempotencyKey);
      if (existingRecord) {
        if (!existingRecord.isMatchingRequest(requestHash)) {
          throw new IdempotencyConflictError(
            `A chave de idempotência '${idempotencyKey}' já foi utilizada para outra transferência.`
          );
        }
        return {
          ...existingRecord.responseBody,
          isIdempotentReplay: true,
        };
      }
    }

    // 2. Execução Atômica e Isolada com Lock de Concorrência
    return this.db.withLock(async () => {
      // Re-verificar idempotência dentro do lock para evitar condições de corrida em retentativas simultâneas
      if (idempotencyKey && this.idempotencyRepository) {
        const doubleCheck = await this.idempotencyRepository.findByKey(idempotencyKey);
        if (doubleCheck) {
          if (!doubleCheck.isMatchingRequest(requestHash)) {
            throw new IdempotencyConflictError('Conflito detectado na chave de idempotência.');
          }
          return {
            ...doubleCheck.responseBody,
            isIdempotentReplay: true,
          };
        }
      }

      const sourceAccount = await this.accountRepository.findById(sourceAccountId);
      if (!sourceAccount) {
        throw new AccountNotFoundError(`Conta de origem não encontrada: ${sourceAccountId}`);
      }

      const destAccount = await this.accountRepository.findById(destinationAccountId);
      if (!destAccount) {
        throw new AccountNotFoundError(`Conta de destino não encontrada: ${destinationAccountId}`);
      }

      // Validação de saldo suficiente
      sourceAccount.debit(transferMoney);
      destAccount.credit(transferMoney);

      const transfer = new Transfer({
        sourceAccountId,
        destinationAccountId,
        amount: transferMoney,
        idempotencyKey,
      });

      // 3. Integração com o Gateway Anti-Fraude Externo (Mockado/Espionado nos testes)
      if (this.antiFraudGateway) {
        const fraudResult = await this.antiFraudGateway.analyzeTransfer({
          transferId: transfer.id,
          sourceAccountId,
          destinationAccountId,
          amount: transferMoney.decimal,
          timestamp: new Date().toISOString(),
        });

        if (fraudResult && fraudResult.verdict === 'REJECTED') {
          transfer.reject('Transação reprovada pelo gateway anti-fraude.');
          if (this.transactionRepository) {
            await this.transactionRepository.saveTransfer(transfer);
          }
          throw new FraudDetectedError('Transferência rejeitada pela política de segurança e anti-fraude.');
        }
      }

      // 4. Persistência dos saldos atualizados
      await this.accountRepository.updateBalance(sourceAccountId, sourceAccount.balance);
      await this.accountRepository.updateBalance(destinationAccountId, destAccount.balance);

      transfer.complete();

      if (this.transactionRepository) {
        await this.transactionRepository.saveTransfer(transfer);

        // Registro das movimentações no ledger contábil
        const debitTx = new Transaction({
          accountId: sourceAccountId,
          type: TransactionType.DEBIT,
          amount: transferMoney,
          balanceAfter: sourceAccount.balance,
          description: `Transferência enviada para conta ${destAccount.accountNumber}`,
          referenceId: transfer.id,
        });

        const creditTx = new Transaction({
          accountId: destinationAccountId,
          type: TransactionType.CREDIT,
          amount: transferMoney,
          balanceAfter: destAccount.balance,
          description: `Transferência recebida da conta ${sourceAccount.accountNumber}`,
          referenceId: transfer.id,
        });

        await this.transactionRepository.create(debitTx);
        await this.transactionRepository.create(creditTx);
      }

      const responsePayload = {
        transferId: transfer.id,
        status: transfer.status,
        amount: transferMoney.decimal,
        sourceAccountId,
        destinationAccountId,
        sourceBalanceAfter: sourceAccount.balance.decimal,
        idempotencyKey,
        executedAt: new Date().toISOString(),
        isIdempotentReplay: false,
      };

      // 5. Salva registro de idempotência
      if (idempotencyKey && this.idempotencyRepository) {
        const idempRecord = new IdempotencyRecord({
          key: idempotencyKey,
          requestHash,
          statusCode: 201,
          responseBody: responsePayload,
        });
        await this.idempotencyRepository.save(idempRecord);
      }

      return responsePayload;
    });
  }
}

module.exports = TransferService;
