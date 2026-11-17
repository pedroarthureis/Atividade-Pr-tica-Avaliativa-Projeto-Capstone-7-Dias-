const express = require('express');

function createRouter({
  accountController,
  transferController,
  statementController,
  webhookController,
}) {
  const router = express.Router();

  // Healthcheck
  router.get('/health', (req, res) => {
    res.status(200).json({
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      service: 'Wallet API Microservice',
    });
  });

  // 1. Criação e consulta de contas digitais com saldo inicial
  router.post('/accounts', (req, res, next) => accountController.create(req, res, next));
  router.get('/accounts/:id', (req, res, next) => accountController.getById(req, res, next));
  router.get('/accounts/number/:accountNumber', (req, res, next) => accountController.getByNumber(req, res, next));

  // 2. Transferência de saldo entre contas com tratamento de concorrência, saldo insuficiente e idempotência
  router.post('/transfers', (req, res, next) => transferController.transfer(req, res, next));

  // 3. Consulta de extrato com filtros por data e tipo de transação (débito/crédito)
  router.get('/accounts/:id/statement', (req, res, next) => statementController.getStatement(req, res, next));

  // 4. Integração com um serviço de gateway externo fictício (webhook)
  router.post('/webhooks/fraud-notification', (req, res) => webhookController.receiveFraudNotification(req, res));

  return router;
}

module.exports = createRouter;
