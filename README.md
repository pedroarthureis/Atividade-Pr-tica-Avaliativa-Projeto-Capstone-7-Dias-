# Wallet API Microservice - Microsserviço Financeiro

[![CI Pipeline](https://github.com/pedroarthureis/Atividade-Pr-tica-Avaliativa-Projeto-Capstone-7-Dias-/actions/workflows/ci.yml/badge.svg)](https://github.com/pedroarthureis/Atividade-Pr-tica-Avaliativa-Projeto-Capstone-7-Dias-/actions)
[![Coverage](https://img.shields.io/badge/Coverage-97.10%25-brightgreen.svg)](https://github.com/pedroarthureis/Atividade-Pr-tica-Avaliativa-Projeto-Capstone-7-Dias-)
[![Node Version](https://img.shields.io/badge/Node-v20%20LTS-blue.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> API REST de alta confiabilidade para carteira digital e conciliação bancária (*Wallet API*), desenvolvida com **Clean Architecture**, **TDD (Red-Green-Refactor)**, **Test Doubles (Mocks e Stubs)**, **Banco de Dados em Memória (SQLite)**, **Pipeline de CI/CD automatizado no GitHub Actions** e **Estratégia de Branching Git Flow**.

---

## 🚀 Funcionalidades Principais

1. **Criação e Consulta de Contas Digitais**: Abertura de contas com saldo inicial e validação cadastral (KYC).
2. **Transferências Financeiras ACID**: Transferência de saldo entre contas com tratamento estrito de concorrência e saldo insuficiente.
3. **Controle de Idempotência**: Prevenção de débitos duplicados via chave de idempotência (`x-idempotency-key`).
4. **Consulta de Extrato com Filtros**: Lançamentos cronológicos com filtros por data (`startDate`, `endDate`), tipo de transação (`CREDIT`, `DEBIT`) e resumo contábil consolidado.
5. **Integração com Gateway Anti-Fraude**: Análise de risco transacional antes da efetivação de transferências via webhook/HTTP externo.

---

## 🛠️ Tecnologias e Ferramentas

- **Linguagem & Runtime:** Node.js (v20 LTS) / JavaScript ES2021
- **Framework Web:** Express.js
- **Banco de Dados:** SQLite em memória (via `sql.js` WebAssembly) com transações ACID e Mutex de concorrência
- **Testes & Cobertura:** Jest, Supertest, Istanbul
- **Análise Estática & Linting:** ESLint
- **Teste de Carga & Desempenho:** K6 e script de concorrência nativo (50 VUs simultâneas)
- **CI/CD:** GitHub Actions (`.github/workflows/ci.yml`)

---

## 📂 Estrutura do Projeto

```
projeto-self-testing-ci
├── .github/workflows
│   └── ci.yml               <- Pipeline automatizado de CI/CD no GitHub Actions
├── src
│   ├── domain               <- Entidades (Account, Transfer, Transaction), Value Objects (Money) e Erros
│   ├── database             <- Conexão SQLite em memória com Mutex e DDL
│   ├── repositories         <- Repositórios SQLite (Account, Transaction, Idempotency)
│   ├── gateways             <- Gateways externos (AntiFraud e KYC)
│   ├── services             <- Casos de uso e regras de negócio financeiras
│   ├── controllers          <- Controladores REST HTTP
│   ├── routes               <- Rotas da API
│   ├── middlewares          <- Middleware global de tratamento de exceções
│   ├── app.js               <- Instanciação do Express e injeção de dependências
│   └── server.js            <- Bootstrap e inicialização do servidor HTTP
├── tests
│   ├── unit                 <- Testes de lógica pura com TDD (Money, Account, Transfer)
│   ├── integration          <- Testes com Mocks (Anti-Fraude), Stubs (KYC) e SQLite em memória
│   └── e2e                  <- Testes de ponta a ponta via HTTP real (Supertest)
├── load-tests
│   ├── transfer-load-test.js     <- Script K6 com 50 VUs simultâneas
│   └── run-local-load-test.js    <- Runner de teste de concorrência com 50 requisições simultâneas
├── .env.example
├── package.json
├── Makefile
├── RELATORIO_TECNICO.md    <- Documentação formal de requisitos (SRS) e arquitetura
└── README.md
```

---

## ⚙️ Instalação e Execução

### Pré-requisitos
- Node.js >= 18 (recomendado Node.js 20 LTS)
- npm >= 9

### Instalação das dependências
```bash
npm install
```

### Execução do Servidor Local
```bash
npm start
```
O servidor estará ativo em: `http://localhost:3000`  
Healthcheck: `http://localhost:3000/api/health`

---

## 🧪 Execução das Suítes de Testes

### Todos os Testes
```bash
npm test
```

### Testes Unitários (Lógica Pura - TDD)
```bash
npm run test:unit
```

### Testes de Integração (Doubles & DB em Memória)
```bash
npm run test:integration
```

### Testes End-to-End (E2E / Supertest)
```bash
npm run test:e2e
```

### Auditoria de Cobertura de Código (Quality Gate)
```bash
npm run test:coverage
```
*Thresholds exigidos no edital: >= 80% branches e >= 85% linhas/statements.*

### Teste de Carga e Concorrência (50 VUs)
```bash
npm run test:load
```

### Linting / Análise Estática
```bash
npm run lint
```

---

## 📊 Métricas de Cobertura Atingidas

```
=============================== Coverage summary ===============================
Statements   : 97.10% ( 470/484 )  -> Requisito >= 85% [APROVADO]
Branches     : 83.27% ( 239/287 )  -> Requisito >= 80% [APROVADO]
Functions    : 95.87% ( 93/97 )    -> Requisito >= 85% [APROVADO]
Lines        : 97.87% ( 461/471 )  -> Requisito >= 85% [APROVADO]
================================================================================
Test Suites: 14 passed, 14 total | Tests: 72 passed, 72 total
```

---

## 📄 Documentação Completa

Para a especificação formal de requisitos (**SRS**), diagramas de arquitetura, distinção detalhada entre **Mocks e Stubs**, histórico de branching **Git Flow** e métricas de desempenho sob concorrência, consulte o arquivo [RELATORIO_TECNICO.md](RELATORIO_TECNICO.md).
