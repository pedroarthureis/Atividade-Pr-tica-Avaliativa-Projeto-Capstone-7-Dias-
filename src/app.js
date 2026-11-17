const express = require('express');
const cors = require('cors');
const { defaultDatabase } = require('./database/DatabaseConnection');
const SqliteAccountRepository = require('./repositories/SqliteAccountRepository');
const SqliteTransactionRepository = require('./repositories/SqliteTransactionRepository');
const SqliteIdempotencyRepository = require('./repositories/SqliteIdempotencyRepository');
const AntiFraudGateway = require('./gateways/AntiFraudGateway');
const KycGateway = require('./gateways/KycGateway');
const AccountService = require('./services/AccountService');
const TransferService = require('./services/TransferService');
const StatementService = require('./services/StatementService');
const AccountController = require('./controllers/AccountController');
const TransferController = require('./controllers/TransferController');
const StatementController = require('./controllers/StatementController');
const WebhookController = require('./controllers/WebhookController');
const createRouter = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

async function createApp(dependencies = {}) {
  const dbConnection = dependencies.dbConnection || defaultDatabase;
  await dbConnection.initialize();

  const accountRepository = dependencies.accountRepository || new SqliteAccountRepository(dbConnection);
  const transactionRepository = dependencies.transactionRepository || new SqliteTransactionRepository(dbConnection);
  const idempotencyRepository = dependencies.idempotencyRepository || new SqliteIdempotencyRepository(dbConnection);

  const antiFraudGateway = dependencies.antiFraudGateway || new AntiFraudGateway();
  const kycGateway = dependencies.kycGateway || new KycGateway();

  const accountService = dependencies.accountService || new AccountService({
    accountRepository,
    transactionRepository,
    kycGateway,
    dbConnection,
  });

  const transferService = dependencies.transferService || new TransferService({
    accountRepository,
    transactionRepository,
    idempotencyRepository,
    antiFraudGateway,
    dbConnection,
  });

  const statementService = dependencies.statementService || new StatementService({
    accountRepository,
    transactionRepository,
  });

  const accountController = dependencies.accountController || new AccountController(accountService);
  const transferController = dependencies.transferController || new TransferController(transferService);
  const statementController = dependencies.statementController || new StatementController(statementService);
  const webhookController = dependencies.webhookController || new WebhookController();

  const app = express();

  app.use(cors());
  app.use(express.json());

  const apiRouter = createRouter({
    accountController,
    transferController,
    statementController,
    webhookController,
  });

  app.use('/api', apiRouter);

  // Fallback 404
  app.use((_req, res) => {
    res.status(404).json({
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'Endpoint não encontrado.',
        statusCode: 404,
      },
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  return {
    app,
    dbConnection,
    accountService,
    transferService,
    statementService,
  };
}

module.exports = createApp;
