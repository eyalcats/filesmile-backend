# Database and Setup Scripts

This directory contains one-time scripts for database setup, tenant management, and debugging.

## Scripts Overview

### 🏢 Tenant Management
- **`add_priority_tenant.py`** - Creates the Priority Software tenant with priority-software.com domain
- **`add_sample_tenant.py`** - Creates sample tenants for testing (example.com, test.com domains)

### 🗄️ Database Initialization
- **`init_db.py`** - Creates all database tables (tenants, tenant_domains, users)

### 🔍 Debugging Tools
- **`check_env.py`** - Verifies environment variables and database connection
- **`check_tenants.py`** - Lists all tenants and domains in the database

## When to Use These Scripts

### First Time Setup
1. **Local Development:** Run `init_db.py` to create local SQLite tables
2. **Production Deployment:** Run `add_priority_tenant.py` in Render shell after first deployment

### Adding New Tenants
- Use `add_sample_tenant.py` as a template for creating new tenants
- Modify the script with your tenant details

### Debugging Issues
- Use `check_env.py` to verify database connection and environment variables
- Use `check_tenants.py` to see what tenant data exists

## Usage

```bash
# In local development
python scripts/init_db.py
python scripts/add_priority_tenant.py

# In Render shell (after deployment)
cd backend
python scripts/add_priority_tenant.py
python scripts/check_tenants.py
```

## Notes

- These scripts are **one-time setup tools** - not needed for regular operation
- SQLAlchemy handles automatic table creation via `Base.metadata.create_all()`
- No Alembic migrations needed - environments are managed separately
- Scripts work with both SQLite (local) and PostgreSQL (production)
