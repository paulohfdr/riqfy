const logger = require('../utils/logger');

module.exports = function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  logger.error(err.message, {
    status,
    path: req.path,
    method: req.method,
    ip: req.ip,
    stack: isProd ? undefined : err.stack
  });

  if (status === 500 && isProd) {
    return res.status(500).json({ erro: 'Erro interno do servidor' });
  }

  res.status(status).json({ erro: err.message || 'Erro interno' });
};
