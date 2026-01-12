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
├── gmail-addon/       # Google Apps Script Gmail add-on
└── scanner-app/       # Next.js document scanner web app with barcode support
```

### Multi-Tenant Design
- **Tenant isolation**: Each organization has its own ERP configuration
- **Domain-based resolution**: Users are assigned to tenants based on email domain
- **Multi-tenant domains**: One domain can map to multiple tenants (test/dev/prod environments, or different Priority installations)
- **Database models**: `Tenant` ↔ `TenantDomain` (1:N), `User` ↔ `UserTenant` ↔ `Tenant` (M:N via junction)
- **JWT authentication**: Bearer tokens for Outlook add-in (Gmail add-on pending migration)
- **Encrypted credentials**: ERP credentials encrypted with Fernet (PBKDF2 key derivation)

### Two-Tier Credential System
- **Admin credentials** (from `Tenant`): Used for system-level queries (companies, form metadata, search groups) - users lack permissions to Priority system tables
- **User credentials** (from `UserTenant`): Used for document operations (uploads) - creates proper audit trail in Priority

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

# Create and activate virtual environment (Windows)
python -m venv venv
venv\Scripts\activate

# Create and activate virtual environment (Linux/Mac)
python -m venv venv
source venv/bin/activate

# Install dependencies (Python 3.9+ required)
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
# Root compose: API + ngrok tunnel (for Outlook add-in development)
docker-compose up

# Backend-only compose (production-like)
docker-compose -f backend/docker-compose.yml up

# Database persists in named volume: filesmile-database
# To seed fresh database, place filesmile.db in backend/seed_db/ before build
```

### Testing
```bash
cd backend
pip install pytest pytest-asyncio httpx

# Run all tests
pytest

# Run specific test file
pytest tests/test_auth.py

# Run specific test function
pytest tests/test_auth.py::test_function_name -v

# Run with verbose output
pytest -v
```

### Linting/Formatting
```bash
cd backend
black app/
flake8 app/
```

### Scanner App Development
```bash
cd scanner-app
npm install

# Run development server (port 3001)
npm run dev

# Build for production
npm run build

# Lint
npm run lint
```

**VintaSoft Setup**: Download VintaSoft Web TWAIN Service from [vintasoft.com](https://www.vintasoft.com/vstwain-dotnet-web-index.html). Place SDK JS files in `scanner-app/public/vintasoft/`.

## Key Backend Files

- [app/main.py](backend/app/main.py) - FastAPI app entry, lifespan, static file mounting
- [app/services/priority_client.py](backend/app/services/priority_client.py) - Async HTTP client with connection pooling for Priority OData API
- [app/services/auth_helper.py](backend/app/services/auth_helper.py) - Creates PriorityClient from JWT/API-key auth context
- [app/core/auth.py](backend/app/core/auth.py) - JWTService class, token creation/validation
- [app/models/database.py](backend/app/models/database.py) - SQLAlchemy models (Tenant, TenantDomain, User, UserTenant)
- [app/utils/encryption.py](backend/app/utils/encryption.py) - Fernet encryption/decryption for credentials
- [scripts/](backend/scripts/) - Database init, tenant management, debugging utilities (see scripts/README.md)

### API Endpoints Structure
- `/api/v1/auth/*` - Authentication (legacy API key + multi-tenant JWT: tenant resolve, register, login, switch-tenant)
- `/api/v1/search/*` - Document search (groups, documents, companies)
- `/api/v1/attachments/*` - File upload to Priority
- `/api/v1/admin/*` - Tenant/domain/user CRUD

API documentation available at `/docs` (Swagger) and `/redoc` (ReDoc) when running.

## Environment Configuration

Critical environment variables (generate with `openssl rand -hex 32`):
- `SECRET_KEY` - FastAPI secret
- `JWT_SECRET_KEY` - JWT signing key (must be different from SECRET_KEY)
- `ENCRYPTION_KEY` - Fernet encryption key for ERP credentials (**MUST BE BACKED UP**)
- `DATABASE_URL` - SQLite for dev (`sqlite:///./filesmile.db`) or PostgreSQL for prod

## Priority ERP Integration

The backend communicates with Priority via OData API. Key forms:
- `SOF_FSFORMS` / `SOF_FSCLMNS_SUBFORM` - Form/field metadata
- `SOF_FSGROUPS` / `SOF_FSGROUPEXEC_SUBFORM` - Search group configuration (pre-configured in Priority, users can add more)
- `EXTFILES_SUBFORM` - Document attachments

**Generic attachment support**: FileSmile works with ANY Priority form that has an attachment subform - not limited to specific document types.

PriorityClient methods handle OData queries, base64 file encoding, and concurrent form searches.

## Add-in Architecture

### Outlook Add-in ([outlook-addin/](outlook-addin/))
- No build step - Office.js served directly
- [taskpane.js](outlook-addin/src/taskpane.js) - Main UI logic
- [auth-flow.js](outlook-addin/src/auth-flow.js) - JWT login, tenant selection
- [api-client.js](outlook-addin/src/api-client.js) - HTTP requests with Bearer token
- [config.js](outlook-addin/src/config.js) - API URLs, storage keys, i18n (EN/HE)

### Gmail Add-on ([gmail-addon/](gmail-addon/))
- Google Apps Script (deploy via clasp or admin console)
- [Code.gs](gmail-addon/Code.gs) - Main logic
- [ApiClient.gs](gmail-addon/ApiClient.gs) - HTTP requests
- **Status**: Currently uses legacy X-API-Key auth, JWT migration planned after Outlook add-in development completes

### Scanner App ([scanner-app/](scanner-app/))
Next.js 16 web application for document scanning and barcode-based document attachment.

**Tech Stack**: Next.js App Router, TypeScript, Zustand (state), next-intl (i18n: EN/HE), Tailwind CSS 4, Radix UI

**Key Features**:
- TWAIN scanner integration via VintaSoft Web TWAIN SDK (requires local service on ports 25319/25329)
- Barcode detection using @zxing/library to auto-match documents by form prefix + document number
- PDF generation with pdf-lib, viewer with pdfjs-dist
- Deep link support for launching with pre-selected document context

**Key Files**:
- [src/lib/scanner/scanner-service.ts](scanner-app/src/lib/scanner/scanner-service.ts) - VintaSoft SDK wrapper for TWAIN scanning
- [src/lib/api/client.ts](scanner-app/src/lib/api/client.ts) - API client with Zustand store integration
- [src/lib/barcode/detector.ts](scanner-app/src/lib/barcode/detector.ts) - Barcode detection logic
- [src/stores/](scanner-app/src/stores/) - Zustand stores (auth, scanner, settings, image, barcode, document)
- [src/messages/](scanner-app/src/messages/) - i18n translation files (en.json, he.json)

**Environment Variables** (scanner-app/.env.local):
```
NEXT_PUBLIC_API_URL=http://localhost:8002/api/v1
NEXT_PUBLIC_VINTASOFT_REG_USER=...      # VintaSoft license
NEXT_PUBLIC_VINTASOFT_REG_CODE=...
NEXT_PUBLIC_VINTASOFT_REG_URL=...
NEXT_PUBLIC_VINTASOFT_EXPIRATION=...
```

## Frontend Admin Dashboard

Vanilla HTML/CSS/JS - no build step. Served from backend as static files.
- [frontend/dashboard.html](frontend/dashboard.html) - Tenant/domain/user management
- [frontend/app.js](frontend/app.js) - Admin CRUD operations
