import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

import { Database } from './database/connection';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/error-handler';
import { authMiddleware } from './middleware/auth';
import { requestLogger } from './middleware/request-logger';

// Routes
import { authRoutes } from './routes/auth';
import { dashboardRoutes } from './routes/dashboard';
import { secretsRoutes } from './routes/secrets';
import { certificatesRoutes } from './routes/certificates';
import { accessRequestRoutes } from './routes/access-request';
import { policiesRoutes } from './routes/policies';
import { identityGraphRoutes } from './routes/identity-graph';
import { integrationsRoutes } from './routes/integrations';
import { adminRoutes } from './routes/admin';
import { auditRoutes } from './routes/audit';
// Free edition: PAM, AI-powered risk analysis, and compliance reporting
// are paid-plan only — their route files and service are not included in
// this repo at all (not just disabled behind a flag).

// Services
import { EncryptionService } from './services/encryption';
import { AuditService } from './services/audit';

const app = express();
const PORT = parseInt(process.env.PORT || '3000');
const HOST = process.env.HOST || '0.0.0.0';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests' } }
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Compression
app.use(compression());

// Request ID
app.use((req, res, next) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || uuidv4();
  next();
});

// Logging
app.use(morgan('combined', {
  stream: { write: (message: string) => logger.info(message.trim()) }
}));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Initialize services
app.locals.db = new Database();
app.locals.encryption = new EncryptionService();
app.locals.audit = new AuditService(app.locals.db);

// Health check (no auth)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      database: 'healthy',
      redis: 'healthy',
      encryption: 'healthy'
    }
  });
});

app.get('/ready', (req, res) => {
  res.json({ ready: true });
});

// API Routes (require auth)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/v1/secrets', authMiddleware, secretsRoutes);
app.use('/api/v1/certificates', authMiddleware, certificatesRoutes);
app.use('/api/v1/access-requests', authMiddleware, accessRequestRoutes);
app.use('/api/v1/policies', authMiddleware, policiesRoutes);
app.use('/api/v1/identity-graph', authMiddleware, identityGraphRoutes);
app.use('/api/v1/integrations', authMiddleware, integrationsRoutes);
app.use('/api/v1/admin', authMiddleware, adminRoutes);
app.use('/api/v1/audit', authMiddleware, auditRoutes);

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling
app.use(errorHandler);

// Start server
async function start() {
  try {
    // Initialize database
    await app.locals.db.initialize();
    logger.info('Database connected');

    // Initialize encryption
    await app.locals.encryption.initialize();
    logger.info('Encryption service ready');

    // Start server
    app.listen(PORT, HOST, () => {
      logger.info(`BlackSentinel Vault running on ${HOST}:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health: http://${HOST}:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export default app;
