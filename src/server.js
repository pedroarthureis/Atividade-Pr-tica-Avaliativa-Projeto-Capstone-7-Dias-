require('dotenv').config();
const createApp = require('./app');

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  try {
    const { app } = await createApp();
    app.listen(PORT, () => {
      console.log(`[Wallet API] Servidor rodando com sucesso na porta ${PORT}`);
      console.log(`[Wallet API] Documentação & Endpoints ativos em http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('[Wallet API] Falha crítica ao iniciar o servidor:', err);
    process.exit(1);
  }
}

bootstrap();
