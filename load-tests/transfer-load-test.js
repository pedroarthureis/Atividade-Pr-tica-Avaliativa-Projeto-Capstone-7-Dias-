import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Métricas customizadas do teste de carga
const errorRate = new Rate('errors');
const transferLatency = new Trend('transfer_duration_ms');

export const options = {
  scenarios: {
    concurrent_transfers: {
      executor: 'constant-vus',
      vus: 50, // Mínimo de 50 requisições/usuários simultâneos conforme edital
      duration: '30s',
    },
  },
  thresholds: {
    errors: ['rate<0.01'], // Taxa de erro inferior a 1%
    http_req_duration: ['p(95)<250'], // 95% das requisições abaixo de 250ms
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000/api';

// Setup: Cria as contas de origem e destino previamente para o teste de carga
export function setup() {
  const originRes = http.post(
    `${BASE_URL}/accounts`,
    JSON.stringify({
      accountNumber: '990001-K6',
      holderName: 'Conta Origem Carga',
      documentNumber: '99000000199',
      initialBalance: 5000000.0,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  const destRes = http.post(
    `${BASE_URL}/accounts`,
    JSON.stringify({
      accountNumber: '990002-K6',
      holderName: 'Conta Destino Carga',
      documentNumber: '99000000299',
      initialBalance: 1000.0,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  const originId = originRes.json('data.id');
  const destId = destRes.json('data.id');

  return { originId, destId };
}

export default function (data) {
  const idempotencyKey = `k6-${__VU}-${__ITER}-${Date.now()}`;
  const payload = JSON.stringify({
    sourceAccountId: data.originId,
    destinationAccountId: data.destId,
    amount: 10.0,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-idempotency-key': idempotencyKey,
    },
  };

  const startTime = new Date();
  const res = http.post(`${BASE_URL}/transfers`, payload, params);
  const duration = new Date() - startTime;

  transferLatency.add(duration);

  const success = check(res, {
    'status é 201': (r) => r.status === 201,
    'transferência concluída': (r) => r.json('data.status') === 'COMPLETED',
  });

  errorRate.add(!success);
  sleep(0.1);
}
