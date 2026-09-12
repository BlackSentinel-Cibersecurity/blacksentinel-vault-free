# BlackSentinel Vault — Free / Open-Source Edition

> **This is the free, limited edition.** It's a real, functioning secrets
> platform — not a demo — but it is genuinely limited, not just
> flag-disabled: PAM, AI-powered risk analysis, and compliance reporting
> are **not included in this repository's source at all**, and the plan
> is capped at 3 users / 10 secrets (`src/config/edition.ts`), matching
> the Free row of the pricing table. For the full platform with those
> modules and no cap, see [blacksentinel.io](https://blacksentinel.io).

## Autonomous Secrets & Privileged Access Platform

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-orange.svg)](VERSION)
[![Node](https://img.shields.io/badge/node-%3E%3D20-green.svg)](https://nodejs.org)

---

## Descripción

BlackSentinel Vault es una plataforma empresarial para gestión de secretos, acceso privilegiado y seguridad de identidades. Implementa arquitectura Zero Trust con motor de IA para detección de anomalías.

### Características Principales

- **Secrets Management** - Almacenamiento seguro con cifrado AES-256-GCM
- **Privileged Access Management (PAM)** - Control de acceso Just-In-Time
- **Certificate Lifecycle** - Gestión completa de certificados SSL/TLS
- **AI Risk Engine** - Detección de anomalías con machine learning
- **Identity Graph** - Visualización de relaciones de identidades
- **Policy Engine** - RBAC/ABAC con evaluación en tiempo real
- **Compliance Center** - ISO 27001, NIST, SOC 2, PCI DSS, HIPAA, GDPR
- **Audit Trail** - Logs inmutables criptográficamente
- **Session Recording** - Grabación de sesiones privilegiadas
- **MFA** - TOTP, FIDO2, SMS

---

## Capturas de Pantalla

### Dashboard
```
┌─────────────────────────────────────────────────────────┐
│  BlackSentinel Vault                              [👤] │
├─────────┬───────────────────────────────────────────────┤
│ Dashboard│  Security Overview                           │
│ Secrets  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐          │
│ PAM      │  │ 127 │ │ 156 │ │  12 │ │  23 │          │
│ Certs    │  │ Sec │ │ Acc │ │ Sess│ │ Cert│          │
│ Sessions │  └─────┘ └─────┘ └─────┘ └─────┘          │
│ Policies │                                              │
│ Compliance│  [Risk Score] [AI Recommendations]          │
│ Audit    │  [Recent Events] [Active Sessions]          │
│ Admin    │                                              │
└─────────┴───────────────────────────────────────────────┘
```

---

## Instalación Rápida

### Requisitos

- Node.js 20+
- PostgreSQL 14+
- Redis 7+
- Docker (opcional)

### 1. Clonar e Instalar

```bash
git clone https://github.com/blacksentinel/vault.git
cd blacksentinel-vault
npm install
```

### 2. Configurar Base de Datos

```bash
# Iniciar PostgreSQL y Redis con Docker
docker-compose up -d postgres redis

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# Ejecutar migraciones
npm run db:migrate

# Cargar datos iniciales
npm run db:seed
```

### 3. Iniciar Servidor

```bash
# Modo desarrollo
npm run dev

# Modo producción
npm run build
npm start
```

### 4. Acceder

Abrir http://localhost:3000

**Credenciales por defecto:**
- Email: `admin@blacksentinel.com`
- Contraseña: `Admin@123456`

---

## Configuración

### Variables de Entorno

```bash
# Base de datos
DATABASE_URL=postgresql://user:pass@localhost:5432/blacksentinel_vault

# Seguridad (IMPORTANTE: Generar claves únicas)
MASTER_KEY=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 64)

# Redis
REDIS_URL=redis://localhost:6379

# Funcionalidades
AUDIT_LOG_ENABLED=true
AI_ENGINE_ENABLED=true
ENCRYPTION_AT_REST_ENABLED=true
```

### Generar Claves de Seguridad

```bash
# MASTER_KEY (para cifrado de secretos)
openssl rand -hex 32

# JWT_SECRET (para tokens de autenticación)
openssl rand -hex 64

# Contraseña segura
openssl rand -base64 32
```

---

## Despliegue

### Docker (Recomendado)

```bash
# Construir imagen
docker build -t blacksentinel-vault .

# Ejecutar con Docker Compose
docker-compose up -d

# Ver logs
docker-compose logs -f app
```

### Kubernetes

```bash
# Crear namespace
kubectl create namespace blacksentinel-vault

# Aplicar configuración
kubectl apply -f kubernetes/ -n blacksentinel-vault

# Verificar
kubectl get pods -n blacksentinel-vault
```

### Cloud (AWS/Azure/GCP)

Ver [DEPLOYMENT.md](DEPLOYMENT.md) para guías detalladas.

---

## API Endpoints

### Autenticación

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Iniciar sesión |
| POST | `/api/v1/auth/refresh` | Renovar token |
| POST | `/api/v1/auth/logout` | Cerrar sesión |
| GET | `/api/v1/auth/me` | Obtener usuario actual |

### Secrets

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/secrets` | Listar secretos |
| POST | `/api/v1/secrets` | Crear secreto |
| GET | `/api/v1/secrets/:id` | Obtener secreto |
| PUT | `/api/v1/secrets/:id` | Actualizar secreto |
| DELETE | `/api/v1/secrets/:id` | Eliminar secreto |
| POST | `/api/v1/secrets/:id/rotate` | Rotar secreto |

### PAM

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/pam/accounts` | Listar cuentas privilegiadas |
| POST | `/api/v1/pam/accounts` | Crear cuenta |
| POST | `/api/v1/pam/access/jit` | Solicitar acceso JIT |
| POST | `/api/v1/pam/access/jit/:id/approve` | Aprobar acceso JIT |

### Certificados

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/certificates` | Listar certificados |
| POST | `/api/v1/certificates` | Solicitar certificado |
| POST | `/api/v1/certificates/:id/renew` | Renovar certificado |
| POST | `/api/v1/certificates/:id/revoke` | Revocar certificado |

Ver documentación completa en `/api/docs`.

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (HTML/JS)                      │
│                    Dashboard Completo                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (Express)                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │   Auth   │ │  Rate    │ │  Audit   │ │  Error   │      │
│  │   JWT    │ │  Limit   │ │  Log     │ │ Handler  │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│    Secrets    │   │     PAM       │   │  Certificates │
│    Engine     │   │   Service     │   │   Manager     │
└───────────────┘   └───────────────┘   └───────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Services (Encryption, AI, Audit)           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  PostgreSQL  │  │    Redis     │  │   Filesystem │     │
│  │  (Primary)   │  │   (Cache)    │  │  (Audit Log) │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## Seguridad

### Zero Trust

- Nunca confiar, siempre verificar
- Autenticación en cada solicitud
- Autorización basada en contexto
- Minimización de privilegios

### Cifrado

- **En tránsito:** TLS 1.3
- **En reposo:** AES-256-GCM
- **Envolvente:** Clave maestra → Clave de envoltura → Datos

### Cumplimiento

- ISO 27001
- NIST CSF 2.0
- SOC 2 Type II
- PCI DSS 4.0
- HIPAA
- GDPR

---

## Modelo de Negocio

Ver [BUSINESS-MODEL.md](BUSINESS-MODEL.md) para opciones de monetización.

### Opciones de Publicación

1. **SaaS** - Hosting gestionado ($29-399/mes)
2. **Enterprise License** - Licencia perpetual ($5,000-50,000)
3. **Open Source** - Comunidad + Enterprise Edition
4. **White Label** - Rebranding para partners

### Entrega a Organizaciones

- Paquete completo de documentación
- Capacitación incluida
- Soporte técnico 24/7
- Personalización disponible

---

## Desarrollo

### Estructura del Proyecto

```
blackSentinel-vault/
├── src/
│   ├── server.ts          # Servidor principal
│   ├── routes/            # API endpoints
│   ├── services/          # Lógica de negocio
│   ├── database/          # Schema y migraciones
│   ├── middleware/        # Auth, errores, logging
│   └── config/            # Configuración
├── public/                # Frontend
├── scripts/               # Utilidades
├── Dockerfile             # Contenedor
└── docker-compose.yml     # Servicios
```

### Comandos de Desarrollo

```bash
npm run dev              # Servidor con hot-reload
npm run build            # Compilar TypeScript
npm run test             # Ejecutar tests
npm run lint             # Verificar código
npm run typecheck        # Verificar tipos
```

---

## Contribuir

1. Fork el proyecto
2. Crear branch (`git checkout -b feature/nueva-funcionalidad`)
3. Commit (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push (`git push origin feature/nueva-funcionalidad`)
5. Abrir Pull Request

---

## Licencia

Proprietary - BlackSentinel Security Inc.

Para licencias comerciales: sales@blacksentinel.com

---

## Soporte

- **Documentación:** https://docs.blacksentinel.com
- **Email:** support@blacksentinel.com
- **GitHub Issues:** https://github.com/blacksentinel/vault/issues
- **Slack:** #blacksentinel-support

---

## Agradecimientos

Gracias a todas las organizaciones que confían en BlackSentinel Vault para proteger sus activos más críticos.
