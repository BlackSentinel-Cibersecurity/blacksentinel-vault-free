import winston from 'winston';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'blacksentinel-vault' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Always log to stdout/stderr, not just in development: in a container
// (Docker/Kubernetes) the file transports above are the only ones that write
// anywhere durable, but nothing else can read them — `docker logs`, kubectl
// logs, and every log-aggregation pipeline read stdout/stderr. Without this,
// a startup failure is invisible outside the container.
logger.add(new winston.transports.Console({
  format: process.env.NODE_ENV !== 'production'
    ? winston.format.combine(winston.format.colorize(), winston.format.simple())
    : logFormat
}));
