const request = require('supertest');
const createApp = require('../../src/app');
const { DatabaseConnection } = require('../../src/database/DatabaseConnection');

describe('Webhooks and Health API (E2E)', () => {
  let app;
  let dbConnection;

  beforeEach(async () => {
    dbConnection = new DatabaseConnection();
    const setup = await createApp({ dbConnection });
    app = setup.app;
  });

  afterEach(async () => {
    await dbConnection.close();
  });

  it('GET /api/health - deve retornar status UP da aplicação', async () => {
    const res = await request(app).get('/api/health').expect(200);

    expect(res.body.status).toBe('UP');
    expect(res.body.service).toBe('Wallet API Microservice');
  });

  it('POST /api/webhooks/fraud-notification - deve receber e confirmar notificação externa de webhook', async () => {
    const webhookPayload = {
      event: 'TRANSACTION_ANALYSIS',
      transferId: 'tr-webhook-e2e-1',
      riskScore: 0.02,
      verdict: 'APPROVED',
      timestamp: new Date().toISOString(),
    };

    const res = await request(app)
      .post('/api/webhooks/fraud-notification')
      .send(webhookPayload)
      .expect(200);

    expect(res.body.received).toBe(true);
    expect(res.body.transferId).toBe('tr-webhook-e2e-1');
    expect(res.body.verdict).toBe('APPROVED');
  });
});
