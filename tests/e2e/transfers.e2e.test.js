const request = require('supertest');
const createApp = require('../../src/app');
const { DatabaseConnection } = require('../../src/database/DatabaseConnection');

describe('Transfers API (E2E)', () => {
  let app;
  let dbConnection;
  let sourceAccountId;
  let destAccountId;

  beforeEach(async () => {
    dbConnection = new DatabaseConnection();
    const setup = await createApp({ dbConnection });
    app = setup.app;

    // Cria conta de origem com 1000.00
    const originRes = await request(app)
      .post('/api/accounts')
      .send({
        accountNumber: '1111-1',
        holderName: 'Origem E2E',
        documentNumber: '11111111199',
        initialBalance: 1000.0,
      })
      .expect(201);
    sourceAccountId = originRes.body.data.id;

    // Cria conta de destino com 100.00
    const destRes = await request(app)
      .post('/api/accounts')
      .send({
        accountNumber: '2222-2',
        holderName: 'Destino E2E',
        documentNumber: '22222222299',
        initialBalance: 100.0,
      })
      .expect(201);
    destAccountId = destRes.body.data.id;
  });

  afterEach(async () => {
    await dbConnection.close();
  });

  it('POST /api/transfers - deve realizar transferência com sucesso e atualizar ambos os saldos', async () => {
    const response = await request(app)
      .post('/api/transfers')
      .set('x-idempotency-key', 'e2e-transfer-key-01')
      .send({
        sourceAccountId,
        destinationAccountId: destAccountId,
        amount: 250.0,
      })
      .expect(201);

    expect(response.body.message).toBe('Transferência realizada com sucesso.');
    expect(response.body.data.transferId).toBeDefined();
    expect(response.body.data.status).toBe('COMPLETED');
    expect(response.body.data.amount).toBe(250.0);
    expect(response.body.data.sourceBalanceAfter).toBe(750.0);

    // Consulta os saldos atualizados via API
    const originCheck = await request(app).get(`/api/accounts/${sourceAccountId}`).expect(200);
    const destCheck = await request(app).get(`/api/accounts/${destAccountId}`).expect(200);

    expect(originCheck.body.data.balance).toBe(750.0);
    expect(destCheck.body.data.balance).toBe(350.0);
  });

  it('POST /api/transfers - deve retornar 422 quando o saldo for insuficiente', async () => {
    const response = await request(app)
      .post('/api/transfers')
      .send({
        sourceAccountId,
        destinationAccountId: destAccountId,
        amount: 1500.0, // Saldo é 1000.0
      })
      .expect(422);

    expect(response.body.error.code).toBe('INSUFFICIENT_BALANCE');
    expect(response.body.error.message).toMatch(/Saldo insuficiente/);
  });

  it('POST /api/transfers - deve tratar idempotência retornando 200 com payload idêntico no reenvio', async () => {
    const idempotencyKey = 'unique-e2e-idempotency-key-100';

    const firstRes = await request(app)
      .post('/api/transfers')
      .set('x-idempotency-key', idempotencyKey)
      .send({
        sourceAccountId,
        destinationAccountId: destAccountId,
        amount: 150.0,
      })
      .expect(201);

    expect(firstRes.body.data.isIdempotentReplay).toBe(false);

    // Reenvio imediato com a mesma chave
    const replayRes = await request(app)
      .post('/api/transfers')
      .set('x-idempotency-key', idempotencyKey)
      .send({
        sourceAccountId,
        destinationAccountId: destAccountId,
        amount: 150.0,
      })
      .expect(200);

    expect(replayRes.body.data.isIdempotentReplay).toBe(true);
    expect(replayRes.body.data.transferId).toBe(firstRes.body.data.transferId);

    // Verifica que debitou apenas 150 (saldo restante = 850)
    const originCheck = await request(app).get(`/api/accounts/${sourceAccountId}`).expect(200);
    expect(originCheck.body.data.balance).toBe(850.0);
  });

  it('POST /api/transfers - deve retornar 409 em caso de conflito de idempotência (mesma chave, payload alterado)', async () => {
    const idempotencyKey = 'key-conflict-e2e';

    await request(app)
      .post('/api/transfers')
      .set('x-idempotency-key', idempotencyKey)
      .send({
        sourceAccountId,
        destinationAccountId: destAccountId,
        amount: 50.0,
      })
      .expect(201);

    const conflictRes = await request(app)
      .post('/api/transfers')
      .set('x-idempotency-key', idempotencyKey)
      .send({
        sourceAccountId,
        destinationAccountId: destAccountId,
        amount: 99.0, // Alteração do valor
      })
      .expect(409);

    expect(conflictRes.body.error.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('POST /api/transfers - deve retornar 400 se conta de origem e destino forem iguais', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .send({
        sourceAccountId,
        destinationAccountId: sourceAccountId,
        amount: 50.0,
      })
      .expect(400);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
