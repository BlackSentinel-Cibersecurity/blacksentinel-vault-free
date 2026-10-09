# BlackSentinel Vault — Free / Open-Source Edition

> **This is the free, limited edition.** It's a real, functioning secrets
> platform — not a demo — but it is genuinely limited, not just
> flag-disabled: PAM, AI-powered risk analysis, and compliance reporting
> are **not included in this repository's source at all**, and the plan
> is capped at 3 users / 10 secrets (`src/config/edition.ts`), matching
> the Free row of the pricing table. For the full platform with those
> modules and no cap, see [blacksentinel.tech](https://blacksentinel.tech).

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
git clone https://github.com/BlackSentinel-Cibersecurity/blacksentinel-vault-free.git
cd blacksentinel-vault
npm install
```

### 2. Configurar Base de Datos

```bash
# Iniciar PostgreSQL y Redis con Docker
docker-compose up -d postgres redis

# Crear .env con secretos aleatorios (JWT_SECRET, MASTER_KEY, ADMIN_PASSWORD)
./scripts/init-env.sh

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

**Primer acceso:**
- Email: `admin@blacksentinel.com`
- Contraseña: la `ADMIN_PASSWORD` de tu `.env` (la genera `scripts/init-env.sh`). Si no la definiste, Vault crea una aleatoria en el primer arranque y la muestra **una sola vez** en el log (`docker compose logs app`).

> No hay contraseñas por defecto públicas. La clave maestra que cifra tus secretos vive en `MASTER_KEY` o, si no la defines, en el volumen `vault_keys` (`/app/data/master.key`). **Haz copia de seguridad de esa clave:** sin ella, los secretos guardados no se pueden descifrar.

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

# Generar secretos y ejecutar con Docker Compose
./scripts/init-env.sh
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

### Marcos de referencia

El módulo de cumplimiento ayuda a mapear controles contra estos marcos. BlackSentinel no está certificado en ninguno de ellos y usar este software no certifica a tu organización.

- ISO 27001
- NIST CSF 2.0
- SOC 2 Type II
- PCI DSS 4.0
- HIPAA
- GDPR

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

## Antes de ejecutarlo

- Es un **avance técnico** y la edición de código abierto del producto. No incluye garantía ni compromiso de nivel de servicio: pruébalo primero en un entorno de pruebas.
- Es **autoalojado**. BlackSentinel no lo aloja por ti y los planes de pago no están a la venta.
- Cambia todas las credenciales y secretos por defecto antes de exponer cualquier servicio a una red. Nunca despliegues con los valores de ejemplo de `.env.example` o `.env.production`.
- Úsalo solo en sistemas propios o sobre los que tengas autorización explícita para probar o monitorear. Consulta la [Política de Uso Aceptable](https://blacksentinel.tech/acceptable-use/).

## Soporte

- Errores y preguntas: [abre un issue](https://github.com/BlackSentinel-Cibersecurity/blacksentinel-vault-free/issues) en este repositorio.
- Reportes de seguridad: sigue [security.txt](https://blacksentinel.tech/.well-known/security.txt). No abras un issue público para una vulnerabilidad.
- Todo lo demás: BlackSentinel-tech@protonmail.com

## Licencia

MIT. Ver [LICENSE](LICENSE). El nombre y el logo de BlackSentinel no están cubiertos por la licencia.
