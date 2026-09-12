# BlackSentinel Vault - Guía de Despliegue Completa

## Tabla de Contenidos

1. [Opciones de Despliegue](#opciones-de-despliegue)
2. [Despliegue Local](#despliegue-local)
3. [Despliegue Docker](#despliegue-docker)
4. [Despliegue Kubernetes](#despliegue-kubernetes)
5. [Despliegue en la Nube](#despliegue-en-la-nube)
6. [Configuración de Seguridad](#configuracion-de-seguridad)
7. [Opciones de Publicación](#opciones-de-publicacion)
8. [Entrega a Organizaciones](#entrega-a-organizaciones)

---

## Opciones de Despliegue

### Resumen de Opciones

| Opción | Complejidad | Costo | Escalabilidad | Uso Recomendado |
|--------|-------------|-------|---------------|-----------------|
| Local/Docker | Baja | Gratis | Baja | Desarrollo/Pruebas |
| Docker Compose | Media | Baja | Media | PYMES |
| Kubernetes | Alta | Media | Alta | Enterprise |
| AWS/Azure/GCP | Media | Variable | Muy Alta | Gran Escala |
| SaaS (Vender) | Variable | Ingreso | Ilimitada | Negocio |

---

## Despliegue Local

### Requisitos
- Node.js 20+
- Docker Desktop
- 8GB RAM mínimo

### Pasos

```bash
# 1. Clonar el proyecto
cd "BlackSentinel Vault"

# 2. Ejecutar setup automático
./scripts/setup.sh

# 3. Iniciar aplicación
npm run dev

# 4. Acceder
open http://localhost:3000
```

### Credenciales por Defecto
- Email: `admin@blacksentinel.com`
- Contraseña: `Admin@123456`

---

## Despliegue Docker

### Producción con Docker Compose

```bash
# 1. Configurar variables de entorno
cp .env.production .env
# Editar .env con contraseñas seguras

# 2. Generar claves de cifrado
openssl rand -hex 32  # Para MASTER_KEY
openssl rand -hex 64  # Para JWT_SECRET

# 3. Construir y ejecutar
docker-compose up -d --build

# 4. Verificar estado
docker-compose ps
docker-compose logs -f app
```

### Dockerfile Optimizado

El Dockerfile incluye:
- Build multi-etapa para reducir tamaño
- Usuario no-root por seguridad
- Health checks integrados
- Optimización de capas

---

## Despliegue Kubernetes

### Estructura de Archivos

```
kubernetes/
├── namespace.yaml
├── configmap.yaml
├── secrets.yaml
├── deployment.yaml
├── service.yaml
├── ingress.yaml
├── hpa.yaml
└── networkpolicy.yaml
```

### Despliegue con kubectl

```bash
# 1. Crear namespace
kubectl create namespace blacksentinel-vault

# 2. Crear secrets
kubectl create secret generic blacksentinel-secrets \
  --from-literal=JWT_SECRET=$(openssl rand -hex 64) \
  --from-literal=MASTER_KEY=$(openssl rand -hex 32) \
  --from-literal=DATABASE_URL='postgresql://user:pass@postgres:5432/vault' \
  -n blacksentinel-vault

# 3. Aplicar configuración
kubectl apply -f kubernetes/ -n blacksentinel-vault

# 4. Verificar
kubectl get pods -n blacksentinel-vault
kubectl logs -f deployment/blacksentinel-vault -n blacksentinel-vault
```

### Despliegue con Helm

```bash
# Instalar
helm install blacksentinel ./helm/blacksentinel-vault \
  --namespace blacksentinel-vault \
  --create-namespace

# Actualizar
helm upgrade blacksentinel ./helm/blacksentinel-vault \
  --namespace blacksentinel-vault

# Eliminar
helm uninstall blacksentinel -n blacksentinel-vault
```

---

## Despliegue en la Nube

### AWS (ECS/Fargate)

```bash
# 1. Crear ECR repository
aws ecr create-repository --repository-name blacksentinel-vault

# 2. Build y push
docker build -t blacksentinel-vault .
docker tag blacksentinel-vault:latest <account>.dkr.ecr.<region>.amazonaws.com/blacksentinel-vault:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/blacksentinel-vault:latest

# 3. Crear ECS cluster y service
aws ecs create-cluster --cluster-name blacksentinel
aws ecs register-task-definition --cli-input-json file://ecs-task.json
aws ecs create-service --cluster blacksentinel --service-name vault --task-definition blacksentinel-vault
```

### Azure (Container Instances)

```bash
# 1. Crear resource group
az group create --name blacksentinel-rg --location eastus

# 2. Crear container registry
az acr create --resource-group blacksentinel-rg --name blacksentinelacr --sku Standard

# 3. Build y push
az acr build --registry blacksentinelacr --image blacksentinel-vault:latest .

# 4. Desplegar
az container create \
  --resource-group blacksentinel-rg \
  --name blacksentinel-vault \
  --image blacksentinelacr.azurecr.io/blacksentinel-vault:latest \
  --ports 3000 \
  --dns-name-label blacksentinel-vault
```

### Google Cloud (Cloud Run)

```bash
# 1. Build
gcloud builds submit --tag gcr.io/<project>/blacksentinel-vault

# 2. Desplegar
gcloud run deploy blacksentinel-vault \
  --image gcr.io/<project>/blacksentinel-vault \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

---

## Configuración de Seguridad

### Generación de Claves

```bash
# Generar MASTER_KEY (para cifrado)
openssl rand -hex 32

# Generar JWT_SECRET (para tokens)
openssl rand -hex 64

# Generar contraseñas seguras
openssl rand -base64 32
```

### Variables Críticas

| Variable | Descripción | Generar con |
|----------|-------------|-------------|
| MASTER_KEY | Clave maestra de cifrado | `openssl rand -hex 32` |
| JWT_SECRET | Secreto para JWT | `openssl rand -hex 64` |
| DATABASE_URL | URL de PostgreSQL | Construir con contraseña |
| REDIS_PASSWORD | Contraseña Redis | `openssl rand -base64 32` |

### Habilitar SSL/TLS

```bash
# Generar certificado autofirmado (desarrollo)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout server.key -out server.crt

# Para producción: usar Let's Encrypt
certbot certonly --standalone -d vault.yourcompany.com
```

---

## Opciones de Publicación

### 1. Software Libre (Open Source)

**Licencia recomendada:** AGPL-3.0 o Enterprise License

**Plataformas de distribución:**
- GitHub Releases
- GitLab Releases
- Docker Hub
- npm (paquetes)
- PyPI (si hay clientes Python)

**Ventajas:**
- Adopción rápida
- Contribuciones de la comunidad
- Visibilidad de marca

**Modelo de monetización:**
- Enterprise Edition (funciones premium)
- Soporte profesional
- Hosting gestionado

### 2. Software Comercial (SaaS)

**Opciones de hosting:**

| Plataforma | Costo Mensual | Escalabilidad |
|------------|---------------|---------------|
| Railway | $5-20 | Baja-Media |
| Render | $7-25 | Media |
| Fly.io | $5-50 | Media-Alta |
| AWS Lightsail | $5-80 | Media |
| DigitalOcean | $5-100 | Media |
| AWS ECS | Variable | Alta |
| Azure AKS | Variable | Alta |
| GCP GKE | Variable | Alta |

**Estructura de precios SaaS:**

```
Starter: $29/mes
- 5 usuarios
- 100 secretos
- Soporte email

Professional: $99/mes
- 25 usuarios
- 1,000 secretos
- PAM básico
- Soporte chat

Enterprise: $299/mes
- Usuarios ilimitados
- Secretos ilimitados
- PAM completo
- AI/ML
- Soporte 24/7
- SLA 99.9%

Custom: Contactar
- On-premise
- Personalización
- Integración dedicated
```

### 3. Licenciamiento Enterprise

**Modelo de licencia por:
- **Por usuario:** $10-50/usuario/mes
- **Por secret:** $0.01-0.10/secret/mes
- **Por servidor:** $100-500/servidor/mes
- **Flat fee:** $10,000-100,000/año

**Incluir:**
- Código fuente
- Soporte técnico
- Actualizaciones
- Documentación
- Capacitación
- Personalización

---

## Entrega a Organizaciones

### Paquete de Entrega

```
blacksentinel-vault-enterprise/
├── aplicacion/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── kubernetes/
├── documentacion/
│   ├── guia-instalacion.pdf
│   ├── manual-administrador.pdf
│   ├── manual-usuario.pdf
│   ├── arquitectura.pdf
│   └── runbook-operaciones.pdf
├── capacitacion/
│   ├── video-tutoriales/
│   ├── laboratorios-practicos/
│   └── examenes-certificacion
├── soporte/
│   ├── contactos-soporte
│   ├── sla-acuerdo
│   └── formulario-ticket
└── licencia/
    ├── acuerdo-licencia.txt
    └── clave-licencia.txt
```

### Proceso de Entrega

1. **Pre-entrega**
   - Revisión de seguridad (penetration testing)
   - Pruebas de rendimiento
   - Documentación completa
   - Capacitación del equipo

2. **Entrega**
   - Transferencia segura de código
   - Configuración de producción
   - Migración de datos
   - Pruebas de aceptación

3. **Post-entrega**
   - Soporte 30/60/90 días
   - Monitoreo de estabilidad
   - Capacitación avanzada
   - Reuniones de seguimiento

### Contrato Tipo

```markdown
ACUERDO DE LICENCIA DE SOFTWARE ENTERPRISE

1. LICENCIA
   - Uso ilimitado dentro de la organización
   - Hasta [N] servidores de producción
   - [N] usuarios autorizados

2. SOPORTE
   - Soporte técnico 24/7
   - Tiempo de respuesta: 4 horas (crítico)
   - Actualizaciones de seguridad incluidas

3. PERSONALIZACIÓN
   - [N] horas de desarrollo custom
   - Integración con sistemas existentes
   - Branding personalizado

4. PRECIO
   - Licencia anual: $[X]
   - Mantención anual: $[Y] (después del primer año)
   - Soporte premium: $[Z]/año

5. DURACIÓN
   - 12 meses con renovación automática
```

---

## Checklist de Despliegue

### Antes del Despliegue

- [ ] Generar todas las claves de seguridad
- [ ] Configurar base de datos PostgreSQL
- [ ] Configurar Redis
- [ ] Configurar SSL/TLS
- [ ] Configurar backups
- [ ] Configurar monitoreo
- [ ] Revisar logs
- [ ] Pruebas de penetración

### Durante el Despliegue

- [ ] Verificar health checks
- [ ] Monitorear logs
- [ ] Verificar conectividad
- [ ] Probar autenticación
- [ ] Probar funcionalidades críticas

### Después del Despliegue

- [ ] Cambiar contraseñas por defecto
- [ ] Configurar alertas
- [ ] Documentar credenciales
- [ ] Capacitar usuarios
- [ ] Establecer rutinas de backup
- [ ] Plan de recuperación

---

## Comandos Útiles

```bash
# Ver logs
docker-compose logs -f app

# Reiniciar servicios
docker-compose restart

# Actualizar
docker-compose pull && docker-compose up -d

# Backup de base de datos
docker-compose exec postgres pg_dump -U postgres blacksentinel_vault > backup.sql

# Restaurar backup
docker-compose exec -T postgres psql -U postgres blacksentinel_vault < backup.sql

# Monitorear recursos
docker stats

# Limpiar imágenes
docker system prune -a
```

---

## Soporte

- **Documentación:** https://docs.blacksentinel.com
- **Email:** support@blacksentinel.com
- **Slack:** #blacksentinel-support
- **GitHub Issues:** https://github.com/blacksentinel/vault/issues
