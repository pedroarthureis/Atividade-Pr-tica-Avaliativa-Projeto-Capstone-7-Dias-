const request = require('supertest');
const createApp = require('../../src/app');
const { DatabaseConnection } = require('../../src/database/DatabaseConnection');

describe('Accounts API (E2E)', () => {
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

  it('POST /api/accounts - deve criar uma nova conta digital com saldo inicial com sucesso', async () => {
    const payload = {
      accountNumber: '12345-6',
      holderName: 'Pedro Arthur Reis',
      documentNumber: '12345678901',
      initialBalance: 500.0,
    };

    const response = await request(app)
      .post('/api/accounts')
      .send(payload)
      .expect(201);

    expect(response.body.message).toBe('Conta digital criada com sucesso.');
    expect(response.body.data.id).toBeDefined();
    expect(response.body.data.accountNumber).toBe('12345-6');
    expect(response.body.data.balance).toBe(500.0);
    expect(response.body.data.status).toBe('ACTIVE');
  });

  it('POST /api/accounts - deve retornar 400 se tentar cadastrar conta duplicada', async () => {
    const payload = {
      accountNumber: '55555-5',
      holderName: 'Cliente Original',
      documentNumber: '55555555555',
      initialBalance: 100.0,
    };

    await request(app).post('/api/accounts').send(payload).expect(201);

    const dupResponse = await request(app)
      .post('/api/accounts')
      .send(payload)
      .expect(400);

    expect(dupResponse.body.error.code).toBe('VALIDATION_ERROR');
    expect(dupResponse.body.error.message).toMatch(/Já existe uma conta/);
  });

  it('GET /api/accounts/:id - deve consultar a conta existente pelo ID', async () => {
    const createRes = await request(app)
      .post('/api/accounts')
      .send({
        accountNumber: '77889-0',
        holderName: 'Consulta Teste',
        documentNumber: '77889900112',
        initialBalance: 250.0,
      })
      .expect(201);

    const accountId = createRes.body.data.id;

    const getRes = await request(app)
      .get(`/api/accounts/${accountId}`)
      .expect(200);

    expect(getRes.body.data.id).toBe(accountId);
    expect(getRes.body.data.holderName).toBe('Consulta Teste');
    expect(getRes.body.data.balance).toBe(250.0);
  });

  it('GET /api/accounts/:id - deve retornar 404 para ID inexistente', async () => {
    const response = await request(app)
      .get('/api/accounts/non-existent-uuid-1234')
      .expect(404);

    expect(response.body.error.code).toBe('ACCOUNT_NOT_FOUND');
  });

  it('GET /api/accounts/number/:accountNumber - deve consultar conta pelo número', async () => {
    await request(app)
      .post('/api/accounts')
      .send({
        accountNumber: '99999-1',
        holderName: 'Busca Por Numero',
        documentNumber: '99999999911',
        initialBalance: 15.0,
      })
      .expect(201);

    const res = await request(app)
      .get('/api/accounts/number/99999-1')
      .expect(200);

    expect(res.body.data.holderName).toBe('Busca Por Numero');
  });
});
