# SSL Certificates for Local Development

This directory contains self-signed SSL certificates for local development HTTPS.

## Files

- `cert.crt` - SSL certificate file
- `cert.pem` - Certificate chain file  
- `key.pem` - Private key file

## Usage

These certificates are used for local development with HTTPS at `https://lp1378.ceshbel.co.il:8002/`

## Regenerating Certificates

If you need to regenerate the SSL certificates:

```bash
# From backend directory
python scripts/generate_cert.py
```

This will create new certificates in this directory.

## Notes

- **Development only** - These are self-signed certificates for local testing
- **Browser warnings** - You'll see security warnings in browsers (accept them for development)
- **Production** - Use proper SSL certificates from a certificate authority in production
- **Git ignored** - Certificate files are excluded from git for security
