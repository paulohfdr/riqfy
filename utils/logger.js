const winston = require('winston');

const isProd = process.env.NODE_ENV === 'production';

const logger = winston.createLogger({
  level: isProd ? 'warn' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    isProd
      ? winston.format.json()
      : winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
          const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          const err = stack ? `\n${stack}` : '';
          return `${timestamp} [${level.toUpperCase()}] ${message}${extra}${err}`;
        })
  ),
  transports: [
    new winston.transports.Console(),
    ...(isProd ? [
      new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
      new winston.transports.File({ filename: 'logs/app.log' })
    ] : [])
  ]
});

module.exports = logger;
