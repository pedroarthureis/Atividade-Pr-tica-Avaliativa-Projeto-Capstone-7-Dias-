const Money = require('../domain/value-objects/Money');
const { TransactionType } = require('../domain/entities/Transaction');
const { AccountNotFoundError } = require('../domain/errors/DomainErrors');

class StatementService {
  constructor({ accountRepository, transactionRepository }) {
    this.accountRepository = accountRepository;
    this.transactionRepository = transactionRepository;
  }

  async getStatement(accountId, filters = {}) {
    const account = await this.accountRepository.findById(accountId);
    if (!account) {
      throw new AccountNotFoundError(`Conta ${accountId} não encontrada.`);
    }

    const transactions = await this.transactionRepository.findByAccountId(accountId, filters);

    let totalCredits = Money.zero();
    let totalDebits = Money.zero();

    const formattedTransactions = transactions.map((tx) => {
      if (tx.type === TransactionType.CREDIT) {
        totalCredits = totalCredits.add(tx.amount);
      } else if (tx.type === TransactionType.DEBIT) {
        totalDebits = totalDebits.add(tx.amount);
      }

      return {
        id: tx.id,
        type: tx.type,
        amount: tx.amount.decimal,
        balanceAfter: tx.balanceAfter.decimal,
        description: tx.description,
        referenceId: tx.referenceId,
        createdAt: tx.createdAt.toISOString(),
      };
    });

    const netFlow = totalCredits.decimal - totalDebits.decimal;

    return {
      account: {
        id: account.id,
        accountNumber: account.accountNumber,
        holderName: account.holderName,
        currentBalance: account.balance.decimal,
        status: account.status,
      },
      filters: {
        startDate: filters.startDate || null,
        endDate: filters.endDate || null,
        type: filters.type || 'ALL',
      },
      summary: {
        totalCredits: totalCredits.decimal,
        totalDebits: totalDebits.decimal,
        netFlow: Number(netFlow.toFixed(2)),
        transactionCount: transactions.length,
      },
      transactions: formattedTransactions,
    };
  }
}

module.exports = StatementService;
