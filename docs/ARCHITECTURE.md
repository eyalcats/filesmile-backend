# FileSmile Architecture Documentation

This document describes the FileSmile platform architecture for both development (Portainer) and production (Azure) environments.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Development Environment (Portainer)](#2-development-environment-portainer)
3. [Production Environment (Azure)](#3-production-environment-azure)
4. [Services & Components](#4-services--components)
5. [Environment Variables](#5-environment-variables)
6. [Deployment Procedures](#6-deployment-procedures)
7. [Security Considerations](#7-security-considerations)

---

## 1. System Overview

FileSmile is a multi-tenant email-to-Priority ERP integration platform. It enables users to attach emails, email attachments, and scanned documents directly to Priority ERP documents.

### High-Level Architecture

```mermaid
graph TB
    subgraph "Client Applications"
        OL["Outlook Add-in<br/>(Office.js)"]
        GM["Gmail Add-on<br/>(Apps Script)"]
        SC["Scanner Web App<br/>(Next.js)"]
        AD["Admin Dashboard<br/>(Static HTML)"]
    end

    subgraph "FileSmile Platform"
        TR["Traefik<br/>Reverse Proxy<br/>:80/:443"]
        API["FastAPI Backend<br/>:8002"]
        SCA["Scanner App Server<br/>:3001"]
        DB[("PostgreSQL<br/>:5432")]
    end

    subgraph "External Systems"
        PERP["Priority ERP<br/>OData API"]
    end

    OL -->|HTTPS| TR
    GM -->|HTTPS| TR
    SC -->|HTTPS| TR
    AD -->|HTTPS| TR

    TR -->|"/api/*"| API
    TR -->|"/scanner/*"| SCA
    TR -->|"/"| API

    API --> DB
    SCA -->|API calls| API
    API -->|OData| PERP

    style TR fill:#1a73e8,color:#fff
    style API fill:#4caf50,color:#fff
    style SCA fill:#ff9800,color:#fff
    style DB fill:#9c27b0,color:#fff
```

### Component Descriptions

| Component | Technology | Purpose |
|-----------|------------|---------|
| **FastAPI Backend** | Python 3.11, FastAPI, SQLAlchemy | Core API server - handles authentication, document search, attachment uploads, serves static frontend and Outlook add-in |
| **Scanner App** | Next.js 16, TypeScript, Zustand | Web application for document scanning via TWAIN and barcode-based document matching |
| **Traefik** | Traefik v3.0 | Reverse proxy with automatic SSL, routing, and load balancing |
| **PostgreSQL** | PostgreSQL 16 | Multi-tenant database for users, tenants, and encrypted credentials |
| **Outlook Add-in** | Office.js, vanilla JS | Email attachment integration for Microsoft Outlook |
| **Gmail Add-on** | Google Apps Script | Email attachment integration for Gmail |
| **Admin Dashboard** | Static HTML/CSS/JS | Tenant and user management interface |

---

## 2. Development Environment (Portainer)

### Architecture Diagram

```mermaid
graph TB
    subgraph "Portainer Stack: filesmile-dev"
        subgraph "Docker Network: filesmile-net"
            TR["traefik<br/>:80 :443 :8080"]
            API["filesmile-api<br/>:8002"]
            SCA["scanner-app<br/>:3001"]
            PG[("postgres<br/>:5432")]
        end

        subgraph "Volumes"
            VOL1[("postgres-data")]
            VOL2[("traefik-certs")]
            VOL3[("filesmile-db")]
        end
    end

    DEV["Developer<br/>Workstation"] -->|"http://filesmile.local"| TR

    TR -->|"/api/*"| API
    TR -->|"/scanner/*"| SCA
    TR -->|"/"| API

    API --> PG
    PG --> VOL1
    TR --> VOL2
    API --> VOL3

    style TR fill:#1a73e8,color:#fff
    style API fill:#4caf50,color:#fff
    style SCA fill:#ff9800,color:#fff
    style PG fill:#9c27b0,color:#fff
```

### Stack Configuration

The development stack runs in Portainer using `docker-compose.portainer.yml`:

| Service | Container | Exposed Ports | Internal Port |
|---------|-----------|---------------|---------------|
| Traefik | traefik | 80, 443, 8080 (dashboard) | - |
| FastAPI Backend | filesmile-api | - | 8002 |
| Scanner App | scanner-app | - | 3001 |
| PostgreSQL | postgres | 5432 (optional) | 5432 |

### Network Configuration

- **Network**: `filesmile-net` (bridge)
- **DNS**: Use container names for inter-service communication
- **External access**: Only through Traefik on ports 80/443

### Volume Mounts

| Volume | Container | Mount Path | Purpose |
|--------|-----------|------------|---------|
| `postgres-data` | postgres | /var/lib/postgresql/data | Database persistence |
| `traefik-certs` | traefik | /letsencrypt | SSL certificates |
| `filesmile-db` | filesmile-api | /app/db | SQLite fallback / seed data |

---

## 3. Production Environment (Azure)

### Architecture Diagram

```mermaid
graph TB
    subgraph "Internet"
        USERS["Users / Clients"]
    end

    subgraph "Azure Subscription"
        subgraph "Resource Group: rg-filesmile-prod"
            subgraph "Container Apps Environment"
                TR["Traefik<br/>Container App"]
                API["filesmile-api<br/>Container App"]
                SCA["scanner-app<br/>Container App"]
            end

            ACR["Azure Container Registry<br/>filesmilecr.azurecr.io"]
            PG[("Azure Database<br/>for PostgreSQL<br/>Flexible Server")]
            KV["Azure Key Vault<br/>kv-filesmile"]
            VNET["Virtual Network<br/>vnet-filesmile"]
        end
    end

    subgraph "External"
        PERP["Priority ERP<br/>(On-Premise/Cloud)"]
    end

    USERS -->|"HTTPS<br/>*.yourdomain.com"| TR
    TR --> API
    TR --> SCA
    API --> PG
    API --> KV
    SCA --> API

    ACR -.->|"Pull images"| TR
    ACR -.->|"Pull images"| API
    ACR -.->|"Pull images"| SCA

    API -->|"OData API"| PERP

    VNET --- API
    VNET --- SCA
    VNET --- PG

    style TR fill:#1a73e8,color:#fff
    style API fill:#4caf50,color:#fff
    style SCA fill:#ff9800,color:#fff
    style PG fill:#9c27b0,color:#fff
    style ACR fill:#0078d4,color:#fff
    style KV fill:#0078d4,color:#fff
```

### Azure Resources

| Resource | Type | SKU/Tier | Purpose |
|----------|------|----------|---------|
| `rg-filesmile-prod` | Resource Group | - | Container for all resources |
| `cae-filesmile` | Container Apps Environment | Consumption | Hosts all container apps |
| `ca-filesmile-api` | Container App | Consumption | FastAPI backend |
| `ca-scanner-app` | Container App | Consumption | Next.js scanner app |
| `ca-traefik` | Container App | Consumption | Reverse proxy (optional*) |
| `filesmilecr` | Container Registry | Basic | Docker image storage |
| `psql-filesmile` | PostgreSQL Flexible Server | Burstable B1ms | Production database |
| `kv-filesmile` | Key Vault | Standard | Secrets management |
| `vnet-filesmile` | Virtual Network | - | Network isolation |

> *Note: Azure Container Apps has built-in ingress. Traefik is optional but provides consistent dev/prod parity.

### Container Apps Configuration

```yaml
# Example: filesmile-api Container App
resources:
  cpu: 0.5
  memory: 1Gi

scale:
  minReplicas: 1
  maxReplicas: 5
  rules:
    - name: http-scaling
      http:
        metadata:
          concurrentRequests: 50

ingress:
  external: true
  targetPort: 8002
  transport: http
```

### Database Configuration

| Setting | Value |
|---------|-------|
| Version | PostgreSQL 16 |
| SKU | Burstable B1ms (1 vCore, 2GB RAM) |
| Storage | 32 GB |
| Backup | Geo-redundant, 7 days retention |
| Connection | SSL required |
| Firewall | Allow Azure services + VNet |

---

## 4. Services & Components

### Service Matrix

| Service | Image | Port | Health Check | Dependencies |
|---------|-------|------|--------------|--------------|
| **filesmile-api** | `filesmilecr.azurecr.io/filesmile-api:latest` | 8002 | `GET /health` | PostgreSQL |
| **scanner-app** | `filesmilecr.azurecr.io/scanner-app:latest` | 3001 | `GET /` | filesmile-api |
| **traefik** | `traefik:v3.0` | 80, 443, 8080 | Built-in | - |
| **postgres** | `postgres:16-alpine` | 5432 | `pg_isready` | - |

### API Endpoints Structure

```
https://api.yourdomain.com/
├── /api/v1/
│   ├── /auth/           # Authentication (JWT)
│   │   ├── POST /tenant/resolve
│   │   ├── POST /login
│   │   ├── POST /register
│   │   └── POST /switch-tenant
│   ├── /search/         # Document search
│   │   ├── GET  /companies
│   │   ├── GET  /groups
│   │   ├── POST /documents
│   │   └── GET  /form-prefixes
│   ├── /attachments/    # File operations
│   │   ├── POST /upload
│   │   ├── GET  /list
│   │   └── DELETE /{id}
│   └── /admin/          # Tenant management
├── /health              # Health check
├── /docs                # Swagger UI
└── /                    # Admin dashboard (static)
```

### Scanner App Routes

```
https://scanner.yourdomain.com/
├── /                    # Main scanner interface
├── /en/                 # English locale
├── /he/                 # Hebrew locale
└── /_next/              # Next.js assets
```

---

## 5. Environment Variables

### Backend (filesmile-api)

| Variable | Required | Development | Production | Description |
|----------|----------|-------------|------------|-------------|
| `DATABASE_URL` | Yes | `postgresql://filesmile:password@postgres:5432/filesmile` | `postgresql://...@psql-filesmile.postgres.database.azure.com:5432/filesmile?sslmode=require` | Database connection string |
| `SECRET_KEY` | Yes | Generate with `openssl rand -hex 32` | Azure Key Vault | FastAPI session secret |
| `JWT_SECRET_KEY` | Yes | Generate with `openssl rand -hex 32` | Azure Key Vault | JWT signing key |
| `ENCRYPTION_KEY` | Yes | Generate with `openssl rand -hex 32` | Azure Key Vault | ERP credential encryption |
| `API_TITLE` | No | `FileSmile API (Dev)` | `FileSmile API` | API title in docs |
| `API_VERSION` | No | `2.0.0` | `2.0.0` | API version |
| `DEBUG` | No | `True` | `False` | Debug mode |
| `ALLOWED_ORIGINS` | Yes | `*` | `https://yourdomain.com,https://scanner.yourdomain.com` | CORS allowed origins |

### Scanner App (scanner-app)

| Variable | Required | Development | Production | Description |
|----------|----------|-------------|------------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | `http://localhost:8002/api/v1` | `https://api.yourdomain.com/api/v1` | Backend API URL |
| `NEXT_PUBLIC_VINTASOFT_REG_USER` | No | VintaSoft license | VintaSoft license | Scanner SDK user |
| `NEXT_PUBLIC_VINTASOFT_REG_CODE` | No | VintaSoft license | VintaSoft license | Scanner SDK code |
| `NEXT_PUBLIC_VINTASOFT_REG_URL` | No | VintaSoft license | VintaSoft license | Scanner SDK URL |
| `NEXT_PUBLIC_VINTASOFT_EXPIRATION` | No | VintaSoft license | VintaSoft license | License expiration |

### PostgreSQL (Development Only)

| Variable | Value | Description |
|----------|-------|-------------|
| `POSTGRES_USER` | `filesmile` | Database user |
| `POSTGRES_PASSWORD` | `filesmile_dev_password` | Database password |
| `POSTGRES_DB` | `filesmile` | Database name |

### Traefik

| Variable | Development | Production | Description |
|----------|-------------|------------|-------------|
| `TRAEFIK_DASHBOARD` | `true` | `false` | Enable dashboard |
| `ACME_EMAIL` | - | `admin@yourdomain.com` | Let's Encrypt email |

---

## 6. Deployment Procedures

### 6.1 Development (Portainer)

#### Prerequisites
- Docker installed on server
- Portainer running
- Git repository access

#### Steps

1. **Clone Repository**
   ```bash
   git clone https://github.com/your-org/FileSmileJS.git
   cd FileSmileJS
   ```

2. **Build Images**
   ```bash
   # Build API image
   docker build -t filesmile-api:latest -f Dockerfile .

   # Build Scanner App image
   docker build -t scanner-app:latest -f scanner-app/Dockerfile ./scanner-app
   ```

3. **Create Environment File**
   ```bash
   cp .env.example .env
   # Edit .env with development values
   ```

4. **Deploy via Portainer**
   - Go to Portainer → Stacks → Add Stack
   - Upload `docker-compose.portainer.yml`
   - Set environment variables
   - Deploy

5. **Verify Deployment**
   ```bash
   curl http://localhost/health
   curl http://localhost/api/v1/docs
   curl http://localhost:3001/
   ```

### 6.2 Production (Azure)

#### Prerequisites
- Azure CLI installed and authenticated
- Azure subscription with required permissions
- Container Registry created

#### Steps

1. **Build and Push Images**
   ```bash
   # Login to Azure Container Registry
   az acr login --name filesmilecr

   # Build and push API
   docker build -t filesmilecr.azurecr.io/filesmile-api:v1.0.0 -f Dockerfile .
   docker push filesmilecr.azurecr.io/filesmile-api:v1.0.0

   # Build and push Scanner App
   docker build -t filesmilecr.azurecr.io/scanner-app:v1.0.0 -f scanner-app/Dockerfile ./scanner-app
   docker push filesmilecr.azurecr.io/scanner-app:v1.0.0
   ```

2. **Create Azure Resources** (via Portal or CLI)
   - Resource Group
   - Container Apps Environment
   - PostgreSQL Flexible Server
   - Key Vault with secrets

3. **Deploy Container Apps**
   ```bash
   # Deploy API
   az containerapp create \
     --name ca-filesmile-api \
     --resource-group rg-filesmile-prod \
     --environment cae-filesmile \
     --image filesmilecr.azurecr.io/filesmile-api:v1.0.0 \
     --target-port 8002 \
     --ingress external \
     --secrets database-url=keyvaultref:... \
     --env-vars DATABASE_URL=secretref:database-url

   # Deploy Scanner App
   az containerapp create \
     --name ca-scanner-app \
     --resource-group rg-filesmile-prod \
     --environment cae-filesmile \
     --image filesmilecr.azurecr.io/scanner-app:v1.0.0 \
     --target-port 3001 \
     --ingress external
   ```

4. **Configure Custom Domain**
   - Add CNAME records in DNS
   - Configure custom domain in Container Apps
   - Enable managed certificate

5. **Verify Deployment**
   ```bash
   curl https://api.yourdomain.com/health
   curl https://scanner.yourdomain.com/
   ```

---

## 7. Security Considerations

### Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Client as Client App
    participant API as FileSmile API
    participant DB as PostgreSQL
    participant ERP as Priority ERP

    User->>Client: Enter email
    Client->>API: POST /auth/tenant/resolve
    API->>DB: Lookup tenant by domain
    DB-->>API: Tenant info
    API-->>Client: Tenant options

    User->>Client: Enter ERP credentials
    Client->>API: POST /auth/register
    API->>ERP: Validate credentials
    ERP-->>API: Success
    API->>DB: Store encrypted credentials
    API-->>Client: JWT token

    Client->>API: GET /search/documents
    Note over Client,API: Authorization: Bearer {JWT}
    API->>DB: Get user's encrypted creds
    API->>ERP: Query documents
    ERP-->>API: Results
    API-->>Client: Documents
```

### Security Checklist

- [ ] All secrets stored in Azure Key Vault (production)
- [ ] PostgreSQL SSL connection required
- [ ] CORS restricted to known origins
- [ ] JWT tokens expire after 24 hours
- [ ] ERP credentials encrypted with Fernet (AES-128)
- [ ] Non-root container users
- [ ] Network isolation via VNet
- [ ] HTTPS enforced (redirect HTTP → HTTPS)
- [ ] Container vulnerability scanning enabled

### Backup & Recovery

| Component | Backup Method | Retention | RTO |
|-----------|--------------|-----------|-----|
| PostgreSQL | Azure automated backup | 7 days | 1 hour |
| Encryption keys | Key Vault soft-delete | 90 days | N/A |
| Container images | ACR geo-replication | - | Minutes |

---

## Appendix: File Reference

| File | Purpose |
|------|---------|
| `Dockerfile` | Root Dockerfile for API |
| `scanner-app/Dockerfile` | Dockerfile for Scanner App |
| `docker-compose.yml` | Development compose (local) |
| `docker-compose.portainer.yml` | Portainer-ready full stack |
| `.env.example` | Environment template |
| `entrypoint.sh` | API container entrypoint |
