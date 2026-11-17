const request = require('supertest');
const createApp = require('../../src/app');
const { DatabaseConnection } = require('../../src/database/DatabaseConnection');

describe('Statement API (E2E)', () => {
  let app;
  let dbConnection;
  let accountId;
  let peerAccountId;

  beforeEach(async () => {
    dbConnection = new DatabaseConnection();
    const setup = await createApp({ dbConnection });
    app = setup.app;

    // Cria conta principal com saldo inicial de 1000
    const accRes = await request(app)
      .post('/api/accounts')
      .send({
        accountNumber: '9001-1',
        holderName: 'Cliente Extrato E2E',
        documentNumber: '90011122233',
        initialBalance: 1000.0,
      })
      .expect(201);
    accountId = accRes.body.data.id;

    // Cria conta parceira
    const peerRes = await request(app)
      .post('/api/accounts')
      .send({
        accountNumber: '9002-2',
        holderName: 'Parceiro Transferência',
        documentNumber: '90022233344',
        initialBalance: 50.0,
      })
      .expect(201);
    peerAccountId = peerRes.body.data.id;

    // Realiza 2 transferências
    await request(app)
      .post('/api/transfers')
      .send({
        sourceAccountId: accountId,
        destinationAccountId: peerAccountId,
        amount: 300.0,
      })
      .expect(201);

    await request(app)
      .post('/api/transfers')
      .send({
        sourceAccountId: accountId,
        destinationAccountId: peerAccountId,
        amount: 200.0,
      })
      .expect(201);
  });

  afterEach(async () => {
    await dbConnection.close();
  });

  it('GET /api/accounts/:id/statement - deve consultar extrato completo e calcular resumo contábil', async () => {
    const res = await request(app)
      .get(`/api/accounts/${accountId}/statement`)
      .expect(200);

    expect(res.body.data.account.accountNumber).toBe('9001-1');
    expect(res.body.data.account.currentBalance).toBe(500.0);
    expect(res.body.data.summary.totalCredits).toBe(1000.0);
    expect(res.body.data.summary.totalDebits).toBe(500.0);
    expect(res.body.data.summary.netFlow).toBe(500.0);
    expect(res.body.data.transactions.length).toBe(3); // 1 depósito de abertura + 2 débitos de transferência
  });

  it('GET /api/accounts/:id/statement?type=DEBIT - deve filtrar apenas transações de débito', async () => {
    const res = await request(app)
      .get(`/api/accounts/${accountId}/statement?type=DEBIT`)
      .expect(200);

    expect(res.body.data.summary.transactionCount).toBe(2);
    expect(res.body.data.transactions.every((t) => t.type === 'DEBIT')).toBe(true);
    expect(res.body.data.summary.totalDebits).toBe(500.0);
    expect(res.body.data.summary.totalCredits).toBe(0.0);
  });

  it('GET /api/accounts/:id/statement?type=CREDIT - deve filtrar apenas transações de crédito', async () => {
    const res = await request(app)
      .get(`/api/accounts/${accountId}/statement?type=CREDIT`)
      .expect(200);

    expect(res.body.data.summary.transactionCount).toBe(1);
    expect(res.body.data.transactions[0].type).toBe('CREDIT');
    expect(res.body.data.summary.totalCredits).toBe(1000.0);
  });

  it('GET /api/accounts/:id/statement - deve retornar 404 para conta inexistente', async () => {
    const res = await request(app)
      .get('/api/accounts/non-existent-account-999/statement')
      .expect(404);

    expect(res.body.error.code).toBe('ACCOUNT_NOT_FOUND');
  });
});
