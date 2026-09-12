# BlackSentinel Vault - Architecture Overview

## Executive Summary

BlackSentinel Vault is a next-generation autonomous secrets and privileged access management platform designed for enterprise environments. It combines traditional PAM capabilities with modern zero-trust principles, AI-driven risk assessment, and comprehensive secrets lifecycle management.

## Design Principles

### 1. Zero Trust Architecture

Every request is authenticated, authorized, and validated. No implicit trust is granted based on network location or identity alone.

### 2. Defense in Depth

Multiple layers of security controls protect against various attack vectors:

- Network segmentation
- Application-level security
- Data encryption
- Access controls
- Monitoring and alerting

### 3. Least Privilege

Users and services receive only the minimum permissions necessary to perform their functions.

### 4. Separation of Duties

Critical operations require multiple approvals and cannot be performed by a single individual.

### 5. Immutable Audit Trail

All actions are logged in cryptographically signed, tamper-evident audit logs.

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENTS                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │   Web    │  │   CLI    │  │   API    │  │   SDK    │           │
│  │ Console  │  │          │  │          │  │          │           │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        LOAD BALANCER                                │
│                    (nginx / ALB / NLB)                              │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      API GATEWAY (Kong/Envoy)                       │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐         │
│  │ Rate Limiting│ Authentication│ Authorization│ Request Logging│    │
│  └─────────────┴─────────────┴─────────────┴─────────────┘         │
└─────────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│    Secrets    │   │     PAM       │   │   Identity    │
│    Engine     │   │   Service     │   │    Graph      │
└───────────────┘   └───────────────┘   └───────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  Certificate  │   │    Policy     │   │      AI       │
│   Manager     │   │    Engine     │   │    Engine     │
└───────────────┘   └───────────────┘   └───────────────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      EVENT BUS (Kafka/RabbitMQ)                     │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │PostgreSQL│  │  Redis   │  │ KMS/HSM  │  │  S3/MinIO│           │
│  │ (Primary)│  │ (Cache)  │  │          │  │          │           │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │
└─────────────────────────────────────────────────────────────────────┘
```

### Microservices Breakdown

#### 1. API Gateway Service
- **Port**: 3000
- **Responsibilities**:
  - Request routing
  - Rate limiting
  - Authentication
  - Authorization
  - Request/response transformation
  - API versioning

#### 2. Secrets Engine
- **Port**: 3001
- **Responsibilities**:
  - Secret storage and retrieval
  - Envelope encryption
  - Secret rotation
  - Access control
  - Version management
  - Search and indexing

#### 3. PAM Service
- **Port**: 3002
- **Responsibilities**:
  - Privileged account management
  - Just-in-time access
  - Session management
  - Credential rotation
  - Discovery scanning

#### 4. Certificate Manager
- **Port**: 3003
- **Responsibilities**:
  - Certificate lifecycle management
  - ACME integration
  - Renewal automation
  - Revocation handling

#### 5. Policy Engine
- **Responsibilities**:
  - RBAC/ABAC evaluation
  - Policy simulation
  - Access decisions
  - Compliance checks

#### 6. AI Engine
- **Responsibilities**:
  - Risk scoring
  - Anomaly detection
  - Behavioral analysis
  - Recommendations
  - Natural language processing

#### 7. Audit Service
- **Responsibilities**:
  - Event logging
  - Immutable audit trail
  - Compliance reporting
  - Alert generation

## Data Flow

### Secret Access Flow

```
Client → API Gateway → Auth Check → Policy Check → Secrets Engine
                ↓              ↓              ↓
            Rate Limit    JWT Verify    RBAC/ABAC
                ↓              ↓              ↓
            Audit Log ← ← ← ← ← ← ← ← ← ←
```

### JIT Access Flow

```
Request → API Gateway → PAM Service → Approval Workflow
                ↓              ↓              ↓
            Auth Check    Policy Check   Multi-level
                ↓              ↓          Approval
            Audit Log ← ← ← ← ← ← ← ← ←
                ↓
         Session Start → Recording → Auto-revoke
```

## Security Architecture

### Encryption Layers

1. **Transport Encryption**: TLS 1.3 for all communications
2. **Data Encryption**: AES-256-GCM for data at rest
3. **Key Wrapping**: Envelope encryption with master key
4. **Field Encryption**: Individual field encryption for sensitive data

### Key Hierarchy

```
Master Key (HSM)
    ↓
Key Encryption Key (KEK)
    ↓
Data Encryption Key (DEK)
    ↓
Encrypted Data
```

### Authentication Flow

```
User → Login → MFA Challenge → JWT Issued
                ↓
        Risk Assessment → Adaptive Auth
                ↓
        Session Created → Monitoring
```

## Scalability

### Horizontal Scaling

- Stateless microservices
- Load balancing across instances
- Database read replicas
- Redis cluster for caching

### Vertical Scaling

- Resource limits per service
- Auto-scaling based on metrics
- Connection pooling
- Query optimization

## Disaster Recovery

### Backup Strategy

- **Database**: Continuous replication + daily snapshots
- **Secrets**: Encrypted backups with separate key
- **Configuration**: Version controlled in Git
- **Audit Logs**: Real-time replication to DR site

### Recovery Procedures

- **RPO**: 1 hour
- **RTO**: 4 hours
- **Failover**: Automated with health checks

## Monitoring & Observability

### Metrics

- Prometheus for metrics collection
- Grafana for visualization
- Custom dashboards for business metrics

### Logging

- Structured JSON logging
- Centralized log aggregation
- Real-time log analysis

### Tracing

- Distributed tracing with Jaeger
- Request correlation
- Performance monitoring

## Compliance

### Audit Requirements

- All access attempts logged
- Cryptographically signed audit logs
- Tamper-evident storage
- Retention policy enforcement

### Standards Support

- ISO 27001
- NIST CSF
- SOC 2 Type II
- PCI DSS 4.0
- HIPAA
- GDPR
