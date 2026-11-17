const { DomainError } = require('../domain/errors/DomainErrors');

function errorHandler(err, req, res, _next) {
  if (err instanceof DomainError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        statusCode: err.statusCode,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Erro interno não tratado
  const isDev = process.env.NODE_ENV !== 'production';
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocorreu um erro interno inesperado no servidor.',
      statusCode: 500,
      timestamp: new Date().toISOString(),
      details: isDev ? err.message : undefined,
    },
  });
}

module.exports = errorHandler;
