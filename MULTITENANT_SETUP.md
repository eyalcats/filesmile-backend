# Multi-Tenant Setup Guide

This guide explains how to set up and use the multi-tenant JWT authentication system for FileSmile.

## 🏗️ Architecture Overview

The multi-tenant system allows multiple organizations to use the same FileSmile deployment with:
- **Tenant isolation**: Each organization has its own ERP configuration
- **Domain-based resolution**: Users are automatically assigned to tenants based on their email domain
- **Secure credential storage**: ERP credentials are encrypted at rest
- **JWT authentication**: Users authenticate with Bearer tokens instead of sharing API keys

### Key Components

1. **Database Models**:
   - `Tenant`: Organizations with ERP admin config
   - `TenantDomain`: Email domains mapped to tenants
   - `User`: End users with encrypted ERP credentials

2. **Authentication Flow**:
   - User opens Outlook add-in → Email extracted
   - Backend resolves tenant from email domain
   - User enters ERP credentials → JWT token issued
   - Subsequent API calls use `Authorization: Bearer <JWT>`

3. **Backward Compatibility**:
   - Legacy `X-API-Key` authentication still works
   - Existing add-ins continue to function

---

## 📦 Installation & Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

New dependencies added:
- `sqlalchemy==2.0.23` - Database ORM
- `alembic==1.13.1` - Database migrations
- `cryptography==41.0.7` - Credential encryption

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

**Critical settings** (generate secure keys):

```bash
# Generate SECRET_KEY
openssl rand -hex 32

# Generate JWT_SECRET_KEY (use a DIFFERENT key!)
openssl rand -hex 32

# Generate ENCRYPTION_KEY (BACKUP THIS KEY!)
openssl rand -hex 32
```

Update `.env`:

```ini
# JWT Authentication
JWT_SECRET_KEY=<your-generated-jwt-secret>
JWT_EXPIRE_MINUTES=1440  # 24 hours

# Encryption for ERP credentials
ENCRYPTION_KEY=<your-generated-encryption-key>

# Database
DATABASE_URL=sqlite:///./filesmile.db  # or PostgreSQL for production
```

⚠️ **IMPORTANT**:
- Keep `ENCRYPTION_KEY` secure and backed up
- Lost encryption key = lost all stored ERP credentials
- Use different keys for `SECRET_KEY`, `JWT_SECRET_KEY`, and `ENCRYPTION_KEY`

### 3. Initialize Database

```bash
python init_db.py
```

This creates tables:
- `tenants`
- `tenant_domains`
- `users`

### 4. Add Your First Tenant

Edit `add_sample_tenant.py` or create tenants via API/database:

```bash
python add_sample_tenant.py
```

Or manually:

```python
from app.db.session import SessionLocal
from app.models.database import Tenant, TenantDomain
from app.utils.encryption import encrypt_value

db = SessionLocal()

# Create tenant
tenant = Tenant(
    name="Acme Corporation",
    erp_base_url="https://priority.acme.com/odata/Priority",
    erp_company="ACME",
    erp_auth_type="basic",
    erp_admin_username=encrypt_value("admin_user"),
    erp_admin_password_or_token=encrypt_value("admin_password"),
    is_active=True
)
db.add(tenant)
db.flush()

# Add domains
for domain in ["acme.com", "acme.co.il"]:
    db.add(TenantDomain(tenant_id=tenant.id, domain=domain))

db.commit()
```

### 5. Start Backend

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8002 --ssl-keyfile key.pem --ssl-certfile cert.pem
```

---

## 🔐 Authentication Flow

### For Outlook Add-in Users

1. **Open Add-in** → Email auto-detected
2. **Tenant Resolution** → Domain matched to organization
3. **Login Form** → Enter ERP username/password
4. **JWT Token** → Stored locally, sent with all requests
5. **Token Expiry** → Automatic re-login prompt

### API Endpoints

#### 1. Resolve Tenant from Email

```http
POST /api/v1/auth/tenant/resolve
Content-Type: application/json

{
  "email": "user@acme.com"
}
```

Response:
```json
{
  "tenant_id": 1,
  "tenant_name": "Acme Corporation"
}
```

#### 2. Register User / Get JWT

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@acme.com",
  "display_name": "John Doe",
  "erp_username": "johndoe",
  "erp_password_or_token": "password123"
}
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "tenant_id": 1,
  "user_id": 5,
  "email": "user@acme.com",
  "expires_in": 86400
}
```

#### 3. Use JWT in API Calls

```http
GET /api/v1/search/groups
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🔧 Backend Integration

### Using JWT Authentication in Endpoints

The `AuthHelper` automatically handles both JWT and legacy API key auth:

```python
from fastapi import Request, Depends
from sqlalchemy.orm import Session
from app.services.auth_helper import AuthHelper
from app.core.auth import CurrentUser, get_current_user
from app.db.session import get_db

@router.get("/my-endpoint")
async def my_endpoint(
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Create Priority client with appropriate authentication
    client = AuthHelper.create_priority_client(current_user, request)

    # Use client (automatically uses JWT user's tenant + credentials)
    result = await client.some_operation()
    await client.close()

    return result
```

**How it works**:
- If JWT provided → Uses `current_user.tenant` config + `current_user.user` ERP creds
- If X-API-Key provided → Uses legacy encoded credentials
- Otherwise → Falls back to admin credentials from settings

---

## 🎨 Outlook Add-in Integration

### Updated Files

1. **[config.js](outlook-addin/src/config.js)**: Added JWT storage keys
2. **[api-client.js](outlook-addin/src/api-client.js)**: Bearer token support + tenant/register endpoints
3. **[auth-flow.js](outlook-addin/src/auth-flow.js)**: Complete authentication flow handler

### Using the Auth Flow

In your `taskpane.js` initialization:

```javascript
Office.onReady(async (info) => {
    if (info.host === Office.HostType.Outlook) {
        // Initialize multi-tenant authentication
        const authenticated = await AuthFlow.initialize();

        if (!authenticated) {
            console.error('Authentication failed');
            return;
        }

        // User is authenticated, continue with app logic
        await loadSearchGroups();
    }
});
```

### Handling Token Expiry

The API client automatically detects 401 errors:

```javascript
try {
    const documents = await apiClient.searchDocuments(groupId, searchTerm);
} catch (error) {
    if (error.code === 'AUTH_REQUIRED') {
        // Token expired, re-authenticate
        const success = await AuthFlow.handleAuthRequired();
        if (success) {
            // Retry the operation
            return await apiClient.searchDocuments(groupId, searchTerm);
        }
    }
    throw error;
}
```

### Loading the Auth Flow

Update `taskpane.html` to include:

```html
<script src="src/config.js"></script>
<script src="src/api-client.js"></script>
<script src="src/auth-flow.js"></script> <!-- NEW -->
<script src="src/taskpane.js"></script>
```

---

## 🔒 Security Considerations

### Encryption

- **ERP credentials** are encrypted using Fernet (symmetric encryption)
- **Encryption key** is derived from `ENCRYPTION_KEY` using PBKDF2
- **Salt** is hardcoded (consistent key derivation) - consider per-tenant salts for added security

### JWT Tokens

- **Algorithm**: HS256 (HMAC with SHA-256)
- **Expiry**: Configurable via `JWT_EXPIRE_MINUTES` (default 24 hours)
- **Payload**:
  ```json
  {
    "sub": 123,           // user_id
    "tenant_id": 1,       // tenant_id
    "email": "user@...",  // email
    "exp": 1234567890,    // expiration timestamp
    "iat": 1234567000     // issued at timestamp
  }
  ```

### Best Practices

1. **Key Management**:
   - Use different keys for `SECRET_KEY`, `JWT_SECRET_KEY`, `ENCRYPTION_KEY`
   - Store keys in environment variables, never in code
   - Backup `ENCRYPTION_KEY` securely

2. **HTTPS Only**:
   - Always use TLS/SSL in production
   - Backend serves on HTTPS (port 8002 with SSL cert)

3. **Token Expiry**:
   - Default 24 hours is reasonable for add-ins
   - Consider shorter expiry for sensitive operations

4. **Database**:
   - Use PostgreSQL for production (not SQLite)
   - Enable row-level security if supported
   - Regular backups

---

## 🧪 Testing the Setup

### 1. Test Tenant Resolution

```bash
curl -X POST https://localhost:8002/api/v1/auth/tenant/resolve \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}' \
  -k
```

Expected: `{"tenant_id": 1, "tenant_name": "Sample Tenant"}`

### 2. Test User Registration

```bash
curl -X POST https://localhost:8002/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "display_name": "Test User",
    "erp_username": "testuser",
    "erp_password_or_token": "testpass"
  }' \
  -k
```

Expected: JWT token in response

### 3. Test JWT Authentication

```bash
TOKEN="<your-jwt-token-here>"

curl -X GET https://localhost:8002/api/v1/search/groups \
  -H "Authorization: Bearer $TOKEN" \
  -k
```

Expected: List of search groups

---

## 🐛 Troubleshooting

### "TENANT_NOT_FOUND" Error

- **Cause**: No tenant configured for user's email domain
- **Fix**: Add tenant domain to database:
  ```python
  db.add(TenantDomain(tenant_id=1, domain="newdomain.com"))
  db.commit()
  ```

### "User ERP credentials not configured"

- **Cause**: User's ERP username/password not set or decryption failed
- **Fix**:
  - Re-register user via `/auth/register`
  - Check `ENCRYPTION_KEY` hasn't changed

### Token Expired (401)

- **Expected**: Tokens expire after `JWT_EXPIRE_MINUTES`
- **Behavior**: Add-in automatically prompts re-login
- **Fix**: User re-enters ERP credentials

### Database Connection Error

- **Cause**: Database URL invalid or database not initialized
- **Fix**:
  ```bash
  python init_db.py
  ```

---

## 🚀 Migration from Legacy API Keys

Existing users with API keys can continue using them. To migrate:

### Option 1: Automatic Migration

Users will see the new login flow on next add-in launch. Old API keys remain valid.

### Option 2: Force Migration

Clear API keys from storage:

```javascript
ConfigHelper.setApiKey(null);  // Clear old API key
window.location.reload();      // Force re-login with JWT
```

---

## 📊 Database Schema

### Tenants Table

| Column | Type | Description |
|--------|------|-------------|
| id | Integer | Primary key |
| name | String | Tenant name |
| erp_base_url | String | Priority OData base URL |
| erp_company | String | Priority company code |
| erp_admin_username | String | Encrypted admin username |
| erp_admin_password_or_token | Text | Encrypted admin password |
| is_active | Boolean | Tenant enabled? |
| created_at | DateTime | Created timestamp |
| updated_at | DateTime | Updated timestamp |

### Tenant Domains Table

| Column | Type | Description |
|--------|------|-------------|
| id | Integer | Primary key |
| tenant_id | Integer | FK to tenants.id |
| domain | String | Email domain (e.g., "acme.com") |
| created_at | DateTime | Created timestamp |

### Users Table

| Column | Type | Description |
|--------|------|-------------|
| id | Integer | Primary key |
| tenant_id | Integer | FK to tenants.id |
| email | String | User email (unique) |
| display_name | String | User display name |
| role | String | User role (default: "user") |
| erp_username | String | Encrypted ERP username |
| erp_password_or_token | Text | Encrypted ERP password |
| is_active | Boolean | User enabled? |
| created_at | DateTime | Created timestamp |
| updated_at | DateTime | Updated timestamp |

---

## 📝 Summary

You've successfully set up multi-tenant JWT authentication! Key points:

✅ Tenants are isolated by email domain
✅ ERP credentials are encrypted at rest
✅ Users authenticate with JWT tokens
✅ Legacy API keys still work (backward compatible)
✅ Outlook add-in automatically handles authentication

**Next Steps**:
1. Add your production tenants and domains
2. Test with real users
3. Monitor JWT token expiry and user experience
4. Consider implementing admin dashboard for tenant management

For questions or issues, check the troubleshooting section or review the code comments.
