# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FileSmile is a multi-tenant email-to-Priority ERP integration platform. It enables users to attach emails and attachments from Outlook and Gmail directly to Priority ERP documents (invoices, orders, etc.).

## Architecture

```
FileSmileJS/
├── backend/           # Python FastAPI backend (main application)
├── frontend/          # Admin dashboard (vanilla HTML/CSS/JS)
├── outlook-addin/     # Microsoft Outlook Office.js add-in
└── gmail-addon/       # Google Apps Script Gmail add-on
```

### Multi-Tenant Design
- **Tenant isolation**: Each organization has its own ERP configuration
- **Domain-based resolution**: Users are assigned to tenants based on email domain
- **Database models**: `Tenant` → `TenantDomain` ← `User` → `UserTenant` (many-to-many)
- **Dual auth support**: JWT Bearer tokens (new) and legacy X-API-Key (backward compatible)
- **Encrypted credentials**: ERP credentials encrypted with Fernet (PBKDF2 key derivation)

### Request Flow
1. Add-in extracts user's email domain
2. Backend resolves tenant from domain via `TenantDomain` lookup
3. User authenticates → JWT token issued
4. API calls include `Authorization: Bearer <JWT>`
5. `AuthHelper` creates `PriorityClient` with decrypted tenant/user credentials
6. `PriorityClient` makes async OData API calls to Priority ERP

## Common Commands

### Backend Development
```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8002

# Run with HTTPS (local development with self-signed certs)
python app/main.py

# Database initialization
python scripts/init_db.py
python scripts/add_priority_tenant.py    # Add a tenant
python scripts/check_tenants.py          # Verify setup
```

### Docker Deployment
```bash
docker-compose -f backend/docker-compose.yml up
```

### Testing
```bash
cd backend
pip install pytest pytest-asyncio httpx
pytest
```

### Linting/Formatting
```bash
cd backend
black app/
flake8 app/
```

## Key Backend Files

- [app/main.py](backend/app/main.py) - FastAPI app entry, lifespan, static file mounting
- [app/services/priority_client.py](backend/app/services/priority_client.py) - Async HTTP client with connection pooling for Priority OData API
- [app/services/auth_helper.py](backend/app/services/auth_helper.py) - Creates PriorityClient from JWT/API-key auth context
- [app/core/auth.py](backend/app/core/auth.py) - JWTService class, token creation/validation
- [app/models/database.py](backend/app/models/database.py) - SQLAlchemy models (Tenant, TenantDomain, User, UserTenant)
- [app/utils/encryption.py](backend/app/utils/encryption.py) - Fernet encryption/decryption for credentials

### API Endpoints Structure
- `/api/v1/auth/*` - Multi-tenant authentication (tenant resolve, register, login)
- `/api/v1/search/*` - Document search (groups, documents, companies)
- `/api/v1/attachments/*` - File upload to Priority
- `/api/v1/admin/*` - Tenant/domain/user CRUD

## Environment Configuration

Critical environment variables (generate with `openssl rand -hex 32`):
- `SECRET_KEY` - FastAPI secret
- `JWT_SECRET_KEY` - JWT signing key (must be different from SECRET_KEY)
- `ENCRYPTION_KEY` - Fernet encryption key for ERP credentials (**MUST BE BACKED UP**)
- `DATABASE_URL` - SQLite for dev (`sqlite:///./filesmile.db`) or PostgreSQL for prod

## Priority ERP Integration

The backend communicates with Priority via OData API. Key forms:
- `SOF_FSFORMS` / `SOF_FSCLMNS_SUBFORM` - Form/field metadata
- `SOF_FSGROUPS` / `SOF_FSGROUPEXEC_SUBFORM` - Search group configuration
- `EXTFILES_SUBFORM` - Document attachments

PriorityClient methods handle OData queries, base64 file encoding, and concurrent form searches.

## Add-in Architecture

### Outlook Add-in ([outlook-addin/](outlook-addin/))
- No build step - Office.js served directly
- [taskpane.js](outlook-addin/taskpane.js) - Main UI logic
- [auth-flow.js](outlook-addin/auth-flow.js) - JWT login, tenant selection
- [api-client.js](outlook-addin/api-client.js) - HTTP requests with Bearer token
- [config.js](outlook-addin/config.js) - API URLs, storage keys, i18n (EN/HE)

### Gmail Add-on ([gmail-addon/](gmail-addon/))
- Google Apps Script (deploy via clasp or admin console)
- [Code.gs](gmail-addon/Code.gs) - Main logic
- [ApiClient.gs](gmail-addon/ApiClient.gs) - HTTP requests

## Frontend Admin Dashboard

Vanilla HTML/CSS/JS - no build step. Served from backend as static files.
- [frontend/dashboard.html](frontend/dashboard.html) - Tenant/domain/user management
- [frontend/app.js](frontend/app.js) - Admin CRUD operations
