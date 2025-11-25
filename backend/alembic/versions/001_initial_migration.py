"""Initial migration

Revision ID: 001
Revises: 
Create Date: 2025-11-25 16:16:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create tenants table
    op.create_table('tenants',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('erp_base_url', sa.String(length=512), nullable=False),
        sa.Column('erp_auth_type', sa.String(length=50), nullable=True),
        sa.Column('erp_admin_username', sa.String(length=255), nullable=True),
        sa.Column('erp_admin_password_or_token', sa.Text(), nullable=True),
        sa.Column('erp_company', sa.String(length=255), nullable=False),
        sa.Column('erp_tabula_ini', sa.String(length=255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tenants_id'), 'tenants', ['id'], unique=False)
    op.create_index(op.f('ix_tenants_name'), 'tenants', ['name'], unique=False)
    op.create_index(op.f('ix_tenants_is_active'), 'tenants', ['is_active'], unique=False)

    # Create tenant_domains table
    op.create_table('tenant_domains',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('domain', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('domain', name='uq_tenant_domains_domain')
    )
    op.create_index(op.f('ix_tenant_domains_id'), 'tenant_domains', ['id'], unique=False)
    op.create_index(op.f('ix_tenant_domains_tenant_id'), 'tenant_domains', ['tenant_id'], unique=False)
    op.create_index(op.f('ix_tenant_domains_domain'), 'tenant_domains', ['domain'], unique=False)

    # Create users table
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('display_name', sa.String(length=255), nullable=True),
        sa.Column('role', sa.String(length=50), nullable=False),
        sa.Column('erp_username', sa.String(length=255), nullable=True),
        sa.Column('erp_password_or_token', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email', name='uq_users_email')
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_tenant_id'), 'users', ['tenant_id'], unique=False)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=False)
    op.create_index(op.f('ix_users_is_active'), 'users', ['is_active'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_users_is_active'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_index(op.f('ix_users_tenant_id'), table_name='users')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_table('users')
    op.drop_index(op.f('ix_tenant_domains_domain'), table_name='tenant_domains')
    op.drop_index(op.f('ix_tenant_domains_tenant_id'), table_name='tenant_domains')
    op.drop_index(op.f('ix_tenant_domains_id'), table_name='tenant_domains')
    op.drop_table('tenant_domains')
    op.drop_index(op.f('ix_tenants_is_active'), table_name='tenants')
    op.drop_index(op.f('ix_tenants_name'), table_name='tenants')
    op.drop_index(op.f('ix_tenants_id'), table_name='tenants')
    op.drop_table('tenants')
