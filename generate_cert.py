#!/usr/bin/env python3
"""
Generate self-signed SSL certificate for FileSmile development.
"""
from datetime import datetime, timedelta
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
import ipaddress

def generate_self_signed_cert():
    """Generate self-signed certificate with proper SAN entries."""
    
    # Generate private key
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
    )
    
    # Create certificate builder
    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, "IL"),
        x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "Tel Aviv"),
        x509.NameAttribute(NameOID.LOCALITY_NAME, "Tel Aviv"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Priority Software LTD"),
        x509.NameAttribute(NameOID.ORGANIZATIONAL_UNIT_NAME, "FileSmile"),
        x509.NameAttribute(NameOID.COMMON_NAME, "lp1378.ceshbel.co.il"),
    ])
    
    cert_builder = x509.CertificateBuilder()
    cert_builder = cert_builder.subject_name(subject)
    cert_builder = cert_builder.issuer_name(issuer)
    cert_builder = cert_builder.not_valid_before(datetime.utcnow())
    cert_builder = cert_builder.not_valid_after(datetime.utcnow() + timedelta(days=365))
    cert_builder = cert_builder.serial_number(x509.random_serial_number())
    cert_builder = cert_builder.public_key(private_key.public_key())
    
    # Add Subject Alternative Names
    san_names = [
        x509.DNSName("lp1378.ceshbel.co.il"),
        x509.DNSName("localhost"),
        x509.IPAddress(ipaddress.IPv4Address("127.0.0.1")),
    ]
    
    cert_builder = cert_builder.add_extension(
        x509.SubjectAlternativeName(san_names),
        critical=False,
    )
    
    # Add key usage
    cert_builder = cert_builder.add_extension(
        x509.KeyUsage(
            digital_signature=True,
            key_encipherment=True,
            content_commitment=False,
            data_encipherment=False,
            key_agreement=False,
            key_cert_sign=False,
            crl_sign=False,
            encipher_only=False,
            decipher_only=False
        ),
        critical=False,
    )
    
    # Add extended key usage for server authentication
    cert_builder = cert_builder.add_extension(
        x509.ExtendedKeyUsage([x509.oid.ExtendedKeyUsageOID.SERVER_AUTH]),
        critical=False,
    )
    
    # Sign the certificate
    certificate = cert_builder.sign(
        private_key=private_key,
        algorithm=hashes.SHA256(),
    )
    
    # Write certificate to file
    with open("cert.pem", "wb") as f:
        f.write(certificate.public_bytes(serialization.Encoding.PEM))
    
    # Write private key to file
    with open("key.pem", "wb") as f:
        f.write(private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption()
        ))
    
    print("Certificate and key generated successfully!")
    print("Files created: cert.pem, key.pem")
    print("Certificate valid for 365 days")
    print("SAN entries: lp1378.ceshbel.co.il, localhost, 127.0.0.1")

if __name__ == "__main__":
    try:
        generate_self_signed_cert()
    except ImportError:
        print("cryptography package not installed. Run: pip install cryptography")
    except Exception as e:
        print(f"Error generating certificate: {e}")
