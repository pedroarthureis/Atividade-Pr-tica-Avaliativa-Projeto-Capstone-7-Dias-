const fs = require('fs');
const path = require('path');
const http = require('http');
const createApp = require('../src/app');
const { DatabaseConnection } = require('../src/database/DatabaseConnection');

async function sendRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data ? JSON.parse(data) : null,
        });
      });
    });

    req.on('error', (err) => reject(err));
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runLoadTest() {
  console.log('================================================================');
  console.log('   INICIANDO TESTE DE DESEMPENHO E CARGA CONCORRENTE (WALLET API)');
  console.log('================================================================');

  const dbConnection = new DatabaseConnection();
  const { app } = await createApp({ dbConnection });

  const PORT = 3099;
  const server = app.listen(PORT);

  try {
    // 1. Setup de Contas para Teste
    console.log('[Setup] Criando contas de teste para concorrência...');
    const originAcc = await sendRequest(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/accounts',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        accountNumber: 'LOAD-ACC-01',
        holderName: 'Conta Origem Carga',
        documentNumber: '11100099988',
        initialBalance: 500000.0,
      }
    );

    const destAcc = await sendRequest(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/accounts',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        accountNumber: 'LOAD-ACC-02',
        holderName: 'Conta Destino Carga',
        documentNumber: '22200099988',
        initialBalance: 0.0,
      }
    );

    const sourceAccountId = originAcc.body.data.id;
    const destAccountId = destAcc.body.data.id;

    console.log(`[Setup] Contas criadas: Origem (${sourceAccountId}) -> Destino (${destAccountId})`);

    const CONCURRENCY = 50; // Mínimo de 50 requisições simultâneas exigido no edital
    const TRANSFER_AMOUNT = 15.0;
    console.log(`[Carga] Disparando ${CONCURRENCY} requisições simultâneas contra o endpoint /api/transfers...`);

    const startTime = Date.now();
    const latencies = [];
    let successCount = 0;
    let errorCount = 0;

    // Dispara exatamente 50 requisições de forma simultânea via Promise.all
    const requests = Array.from({ length: CONCURRENCY }, async (_, i) => {
      const idempotencyKey = `load-concurrent-key-${i}-${Date.now()}`;
      const reqStart = Date.now();
      try {
        const res = await sendRequest(
          {
            hostname: 'localhost',
            port: PORT,
            path: '/api/transfers',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-idempotency-key': idempotencyKey,
            },
          },
          {
            sourceAccountId,
            destinationAccountId: destAccountId,
            amount: TRANSFER_AMOUNT,
          }
        );

        const latency = Date.now() - reqStart;
        latencies.push(latency);

        if (res.statusCode === 201 && res.body.data && res.body.data.status === 'COMPLETED') {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (err) {
        errorCount++;
      }
    });

    await Promise.all(requests);
    const totalTimeMs = Date.now() - startTime;

    // Métricas
    latencies.sort((a, b) => a - b);
    const minLatency = latencies[0];
    const maxLatency = latencies[latencies.length - 1];
    const sumLatency = latencies.reduce((acc, curr) => acc + curr, 0);
    const avgLatency = Number((sumLatency / latencies.length).toFixed(2));
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];
    const errorRate = Number(((errorCount / CONCURRENCY) * 100).toFixed(2));
    const throughput = Number(((CONCURRENCY / totalTimeMs) * 1000).toFixed(2));

    // Verificação de consistência dos saldos pós-concorrência
    const finalOrigin = await sendRequest({
      hostname: 'localhost',
      port: PORT,
      path: `/api/accounts/${sourceAccountId}`,
      method: 'GET',
    });
    const finalDest = await sendRequest({
      hostname: 'localhost',
      port: PORT,
      path: `/api/accounts/${destAccountId}`,
      method: 'GET',
    });

    const expectedDebited = CONCURRENCY * TRANSFER_AMOUNT;
    const finalOriginBalance = finalOrigin.body.data.balance;
    const finalDestBalance = finalDest.body.data.balance;

    const results = {
      testDate: new Date().toISOString(),
      concurrency: CONCURRENCY,
      totalRequests: CONCURRENCY,
      successCount,
      errorCount,
      errorRatePercent: errorRate,
      totalDurationMs: totalTimeMs,
      throughputReqSec: throughput,
      latencies: {
        minMs: minLatency,
        avgMs: avgLatency,
        p50Ms: p50,
        p95Ms: p95,
        p99Ms: p99,
        maxMs: maxLatency,
      },
      balanceIntegrity: {
        expectedDebited,
        finalOriginBalance,
        finalDestBalance,
        isConsistent: finalDestBalance === expectedDebited,
      },
    };

    console.log('\n================================================================');
    console.log('              RELATÓRIO DE RESULTADOS DO TESTE DE CARGA         ');
    console.log('================================================================');
    console.log(`Concorrência Simultânea:   ${CONCURRENCY} VUs / Conexões`);
    console.log(`Requisições Totais:        ${CONCURRENCY}`);
    console.log(`Sucessos (201 COMPLETED):  ${successCount}`);
    console.log(`Erros / Falhas:            ${errorCount}`);
    console.log(`Taxa de Erro:              ${errorRate}%`);
    console.log(`Tempo Total de Execução:   ${totalTimeMs} ms`);
    console.log(`Throughput Médio:          ${throughput} req/s`);
    console.log('----------------------------------------------------------------');
    console.log(`Latência Mínima:           ${minLatency} ms`);
    console.log(`Latência Média:            ${avgLatency} ms`);
    console.log(`Latência Mediana (p50):    ${p50} ms`);
    console.log(`Latência Percentil 95:     ${p95} ms`);
    console.log(`Latência Percentil 99:     ${p99} ms`);
    console.log(`Latência Máxima:           ${maxLatency} ms`);
    console.log('----------------------------------------------------------------');
    console.log(`Integridade de Saldos:     ${results.balanceIntegrity.isConsistent ? 'PERFEITA (0 deadlocks, 0 perdas)' : 'FALHA'}`);
    console.log(`Saldo Final Destino:       R$ ${finalDestBalance.toFixed(2)} (Esperado: R$ ${expectedDebited.toFixed(2)})`);
    console.log('================================================================\n');

    const outputPath = path.join(__dirname, '..', 'load-test-results.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`Métricas salvas com sucesso em: ${outputPath}`);

    server.close();
    await dbConnection.close();
    return results;
  } catch (err) {
    console.error('Falha no teste de carga:', err);
    server.close();
    await dbConnection.close();
    process.exit(1);
  }
}

if (require.main === module) {
  runLoadTest();
}

module.exports = runLoadTest;
