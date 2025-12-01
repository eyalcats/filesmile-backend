/**
 * Main Application Script
 * 
 * Handles dashboard functionality including:
 * - Navigation between sections
 * - CRUD operations for tenants, domains, and users
 * - Modal management
 * - Toast notifications
 */

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (!Auth.requireAuth()) return;
    
    // Initialize app
    App.init();
});

const App = {
    currentSection: 'tenants',
    currentEditId: null,
    currentDeleteId: null,
    currentDeleteType: null,
    currentUserForTenants: null,  // User being managed in tenants modal
    currentEditUserTenant: null,  // Tenant being edited in user-tenant form
    tenants: [],
    domains: [],
    users: [],
    
    /**
     * Initialize the application
     */
    init() {
        this.setupEventListeners();
        this.loadUserInfo();
        this.loadSection('tenants');
    },
    
    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                this.switchSection(section);
            });
        });
        
        // Mobile menu toggle
        document.getElementById('menuToggle').addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('open');
        });
        
        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            Auth.logout();
            window.location.href = 'index.html';
        });
        
        // Add new button
        document.getElementById('addNewBtn').addEventListener('click', () => {
            this.openAddModal();
        });
        
        // Modal events
        document.getElementById('modalClose').addEventListener('click', () => this.closeModal());
        document.getElementById('modalCancel').addEventListener('click', () => this.closeModal());
        document.getElementById('modalOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeModal();
        });
        document.getElementById('modalSave').addEventListener('click', () => this.saveItem());
        
        // Delete modal events
        document.getElementById('deleteModalClose').addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('deleteCancel').addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('deleteModalOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeDeleteModal();
        });
        document.getElementById('deleteConfirm').addEventListener('click', () => this.confirmDelete());
        
        // User tenants modal events
        document.getElementById('userTenantsModalClose').addEventListener('click', () => this.closeUserTenantsModal());
        document.getElementById('userTenantsModalDone').addEventListener('click', () => this.closeUserTenantsModal());
        document.getElementById('userTenantsModalOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeUserTenantsModal();
        });
        document.getElementById('addUserTenantBtn').addEventListener('click', () => this.openAddUserTenantForm());
        
        // User tenant form modal events
        document.getElementById('userTenantFormModalClose').addEventListener('click', () => this.closeUserTenantFormModal());
        document.getElementById('userTenantFormCancel').addEventListener('click', () => this.closeUserTenantFormModal());
        document.getElementById('userTenantFormModalOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeUserTenantFormModal();
        });
        document.getElementById('userTenantFormSave').addEventListener('click', () => this.saveUserTenant());
        
        // Search inputs
        document.getElementById('tenantsSearch').addEventListener('input', debounce(() => this.loadTenants(), 300));
        document.getElementById('domainsSearch').addEventListener('input', debounce(() => this.loadDomains(), 300));
        document.getElementById('usersSearch').addEventListener('input', debounce(() => this.loadUsers(), 300));
        
        // Filter selects
        document.getElementById('tenantsStatusFilter').addEventListener('change', () => this.loadTenants());
        document.getElementById('domainsTenantFilter').addEventListener('change', () => this.loadDomains());
        document.getElementById('usersTenantFilter').addEventListener('change', () => this.loadUsers());
        document.getElementById('usersStatusFilter').addEventListener('change', () => this.loadUsers());
        
        // Close sidebar on mobile when clicking outside
        document.addEventListener('click', (e) => {
            const sidebar = document.querySelector('.sidebar');
            const menuToggle = document.getElementById('menuToggle');
            if (window.innerWidth <= 1024 && 
                !sidebar.contains(e.target) && 
                !menuToggle.contains(e.target) &&
                sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
            }
        });
    },
    
    /**
     * Load user info into sidebar
     */
    loadUserInfo() {
        const user = Auth.getUser();
        if (user) {
            document.getElementById('currentUser').textContent = user.username || 'Admin';
        }
    },
    
    /**
     * Switch between sections
     * @param {string} section - Section name (tenants, domains, users)
     */
    switchSection(section) {
        this.currentSection = section;
        
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.section === section);
        });
        
        // Update page title
        const titles = {
            tenants: 'Tenants',
            domains: 'Domains',
            users: 'Users'
        };
        document.getElementById('pageTitle').textContent = titles[section];
        
        // Show/hide sections
        document.querySelectorAll('.content-section').forEach(sec => {
            sec.classList.remove('active');
        });
        document.getElementById(`${section}Section`).classList.add('active');
        
        // Load section data
        this.loadSection(section);
        
        // Close mobile menu
        document.querySelector('.sidebar').classList.remove('open');
    },
    
    /**
     * Load section data
     * @param {string} section - Section name
     */
    loadSection(section) {
        switch (section) {
            case 'tenants':
                this.loadTenants();
                break;
            case 'domains':
                this.loadTenants().then(() => this.loadDomains());
                break;
            case 'users':
                this.loadTenants().then(() => this.loadUsers());
                break;
        }
    },
    
    // ==================== TENANTS ====================
    
    /**
     * Load tenants from API
     */
    async loadTenants() {
        const search = document.getElementById('tenantsSearch').value;
        const status = document.getElementById('tenantsStatusFilter').value;
        
        try {
            const response = await API.getTenants({ search, status });
            // Handle response format: { items: [], total: n }
            this.tenants = response.items || response;
        } catch (error) {
            console.error('Failed to load tenants:', error.message);
            this.showToast('error', 'Error', 'Failed to load tenants: ' + error.message);
            this.tenants = [];
        }
        
        this.renderTenants();
        this.updateTenantFilters();
    },
    
    /**
     * Render tenants table
     */
    renderTenants() {
        const tbody = document.getElementById('tenantsTableBody');
        
        if (this.tenants.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="empty-state">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                <polyline points="9 22 9 12 15 12 15 22"></polyline>
                            </svg>
                            <h3>No tenants found</h3>
                            <p>Create your first tenant to get started</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = this.tenants.map(tenant => `
            <tr>
                <td>${tenant.id}</td>
                <td><strong>${this.escapeHtml(tenant.name)}</strong></td>
                <td>${this.escapeHtml(tenant.erp_base_url)}</td>
                <td>${this.escapeHtml(tenant.erp_company)}</td>
                <td>
                    <span class="status-badge ${tenant.is_active ? 'active' : 'inactive'}">
                        ${tenant.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>${this.formatDate(tenant.created_at)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon edit" onclick="App.editTenant(${tenant.id})" title="Edit">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="btn-icon delete" onclick="App.deleteTenant(${tenant.id})" title="Delete">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    },
    
    /**
     * Edit tenant
     * @param {number} id - Tenant ID
     */
    editTenant(id) {
        const tenant = this.tenants.find(t => t.id === id);
        if (!tenant) return;
        
        this.currentEditId = id;
        this.openModal('Edit Tenant', this.getTenantForm(tenant));
    },
    
    /**
     * Delete tenant
     * @param {number} id - Tenant ID
     */
    deleteTenant(id) {
        this.currentDeleteId = id;
        this.currentDeleteType = 'tenant';
        document.getElementById('deleteMessage').textContent = 
            'Are you sure you want to delete this tenant? This will also delete all associated domains and users.';
        this.openDeleteModal();
    },
    
    /**
     * Validate ERP admin credentials from the tenant form
     */
    async validateCredentials() {
        const form = document.getElementById('tenantForm');
        if (!form) return;
        
        const resultSpan = document.getElementById('validateCredentialsResult');
        const validateBtn = document.getElementById('validateCredentialsBtn');
        
        // Get form values
        const erp_base_url = form.querySelector('#erp_base_url').value;
        const erp_company = form.querySelector('#erp_company').value;
        const erp_admin_username = form.querySelector('#erp_admin_username').value;
        const erp_admin_password_or_token = form.querySelector('#erp_admin_password_or_token').value;
        const erp_tabula_ini = form.querySelector('#erp_tabula_ini').value || 'tabula.ini';
        
        // Validate required fields
        if (!erp_base_url || !erp_company || !erp_admin_username) {
            resultSpan.innerHTML = '<span style="color: #e74c3c;">Please fill in ERP Base URL, Company, and Admin Username</span>';
            return;
        }
        
        // For editing existing tenant, password might be empty (unchanged)
        if (!erp_admin_password_or_token && !this.currentEditId) {
            resultSpan.innerHTML = '<span style="color: #e74c3c;">Please enter Admin Password/Token</span>';
            return;
        }
        
        // If editing and no password provided, we can't validate
        if (!erp_admin_password_or_token && this.currentEditId) {
            resultSpan.innerHTML = '<span style="color: #e74c3c;">Enter password to validate credentials</span>';
            return;
        }
        
        // Show loading state
        validateBtn.disabled = true;
        validateBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="margin-right: 6px; vertical-align: middle; animation: spin 1s linear infinite;">
                <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="32"></circle>
            </svg>
            Validating...
        `;
        resultSpan.innerHTML = '';
        
        try {
            const response = await API.validateCredentials({
                erp_base_url,
                erp_company,
                erp_admin_username,
                erp_admin_password_or_token,
                erp_tabula_ini
            });
            
            if (response.valid) {
                resultSpan.innerHTML = `<span style="color: #27ae60;">✓ ${response.message}</span>`;
            } else {
                resultSpan.innerHTML = `<span style="color: #e74c3c;">✗ ${response.message}</span>`;
            }
        } catch (error) {
            resultSpan.innerHTML = `<span style="color: #e74c3c;">✗ ${error.message || 'Validation failed'}</span>`;
        } finally {
            // Restore button
            validateBtn.disabled = false;
            validateBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="margin-right: 6px; vertical-align: middle;">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                Validate Credentials
            `;
        }
    },
    
    // ==================== DOMAINS ====================
    
    /**
     * Load domains from API
     */
    async loadDomains() {
        const search = document.getElementById('domainsSearch').value;
        const tenantId = document.getElementById('domainsTenantFilter').value;
        
        try {
            const response = await API.getDomains({ search, tenant_id: tenantId });
            // Handle response format: { items: [], total: n }
            this.domains = response.items || response;
        } catch (error) {
            console.error('Failed to load domains:', error.message);
            this.showToast('error', 'Error', 'Failed to load domains: ' + error.message);
            this.domains = [];
        }
        
        this.renderDomains();
    },
    
    /**
     * Render domains table
     */
    renderDomains() {
        const tbody = document.getElementById('domainsTableBody');
        
        if (this.domains.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5">
                        <div class="empty-state">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="2" y1="12" x2="22" y2="12"></line>
                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                            </svg>
                            <h3>No domains found</h3>
                            <p>Add a domain to link it to a tenant</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = this.domains.map(domain => {
            const tenant = this.tenants.find(t => t.id === domain.tenant_id);
            return `
                <tr>
                    <td>${domain.id}</td>
                    <td><strong>${this.escapeHtml(domain.domain)}</strong></td>
                    <td>${tenant ? this.escapeHtml(tenant.name) : 'Unknown'}</td>
                    <td>${this.formatDate(domain.created_at)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon edit" onclick="App.editDomain(${domain.id})" title="Edit">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                            <button class="btn-icon delete" onclick="App.deleteDomain(${domain.id})" title="Delete">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },
    
    /**
     * Edit domain
     * @param {number} id - Domain ID
     */
    editDomain(id) {
        const domain = this.domains.find(d => d.id === id);
        if (!domain) return;
        
        this.currentEditId = id;
        this.openModal('Edit Domain', this.getDomainForm(domain));
    },
    
    /**
     * Delete domain
     * @param {number} id - Domain ID
     */
    deleteDomain(id) {
        this.currentDeleteId = id;
        this.currentDeleteType = 'domain';
        document.getElementById('deleteMessage').textContent = 
            'Are you sure you want to delete this domain?';
        this.openDeleteModal();
    },
    
    // ==================== USERS ====================
    
    /**
     * Load users from API
     */
    async loadUsers() {
        const search = document.getElementById('usersSearch').value;
        const tenantId = document.getElementById('usersTenantFilter').value;
        const status = document.getElementById('usersStatusFilter').value;
        
        try {
            const response = await API.getUsers({ search, tenant_id: tenantId, status });
            // Handle response format: { items: [], total: n }
            this.users = response.items || response;
        } catch (error) {
            console.error('Failed to load users:', error.message);
            this.showToast('error', 'Error', 'Failed to load users: ' + error.message);
            this.users = [];
        }
        
        this.renderUsers();
    },
    
    /**
     * Render users table
     */
    renderUsers() {
        const tbody = document.getElementById('usersTableBody');
        
        if (this.users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8">
                        <div class="empty-state">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                            <h3>No users found</h3>
                            <p>Users will appear here when they register</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = this.users.map(user => {
            // Build tenant badges
            const tenantBadges = (user.tenants || []).map(ut => {
                const statusClass = ut.is_active ? 'active' : 'inactive';
                return `<span class="tenant-badge ${statusClass}" title="${ut.is_active ? 'Active' : 'Inactive'}">${this.escapeHtml(ut.tenant_name || 'Unknown')}</span>`;
            }).join('');
            const tenantDisplay = tenantBadges || '<span class="no-tenants">No tenants</span>';
            
            return `
                <tr>
                    <td>${user.id}</td>
                    <td><strong>${this.escapeHtml(user.email)}</strong></td>
                    <td>${user.display_name ? this.escapeHtml(user.display_name) : '-'}</td>
                    <td>
                        <div class="tenant-badges-container">
                            ${tenantDisplay}
                            <button class="btn-icon manage-tenants" onclick="App.manageUserTenants(${user.id})" title="Manage Tenants">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="3"></circle>
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                                </svg>
                            </button>
                        </div>
                    </td>
                    <td>${this.escapeHtml(user.role)}</td>
                    <td>
                        <span class="status-badge ${user.is_active ? 'active' : 'inactive'}">
                            ${user.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td>${this.formatDate(user.created_at)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon edit" onclick="App.editUser(${user.id})" title="Edit">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                            <button class="btn-icon delete" onclick="App.deleteUser(${user.id})" title="Delete">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },
    
    /**
     * Edit user
     * @param {number} id - User ID
     */
    editUser(id) {
        const user = this.users.find(u => u.id === id);
        if (!user) return;
        
        this.currentEditId = id;
        this.openModal('Edit User', this.getUserForm(user));
    },
    
    /**
     * Delete user
     * @param {number} id - User ID
     */
    deleteUser(id) {
        this.currentDeleteId = id;
        this.currentDeleteType = 'user';
        document.getElementById('deleteMessage').textContent = 
            'Are you sure you want to delete this user?';
        this.openDeleteModal();
    },
    
    // ==================== MODAL MANAGEMENT ====================
    
    /**
     * Open add modal based on current section
     */
    openAddModal() {
        this.currentEditId = null;
        
        switch (this.currentSection) {
            case 'tenants':
                this.openModal('Add Tenant', this.getTenantForm());
                break;
            case 'domains':
                this.openModal('Add Domain', this.getDomainForm());
                break;
            case 'users':
                this.openModal('Add User', this.getUserForm());
                break;
        }
    },
    
    /**
     * Open modal with content
     * @param {string} title - Modal title
     * @param {string} content - Modal body HTML
     */
    openModal(title, content) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalBody').innerHTML = content;
        document.getElementById('modalOverlay').classList.add('active');
        document.body.style.overflow = 'hidden';
    },
    
    /**
     * Close modal
     */
    closeModal() {
        document.getElementById('modalOverlay').classList.remove('active');
        document.body.style.overflow = '';
        this.currentEditId = null;
    },
    
    /**
     * Open delete confirmation modal
     */
    openDeleteModal() {
        document.getElementById('deleteModalOverlay').classList.add('active');
        document.body.style.overflow = 'hidden';
    },
    
    /**
     * Close delete modal
     */
    closeDeleteModal() {
        document.getElementById('deleteModalOverlay').classList.remove('active');
        document.body.style.overflow = '';
        this.currentDeleteId = null;
        this.currentDeleteType = null;
    },
    
    /**
     * Save item (create or update)
     */
    async saveItem() {
        const form = document.querySelector('#modalBody form');
        if (!form) return;
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Convert checkbox values
        if ('is_active' in data) {
            data.is_active = data.is_active === 'on';
        }
        
        // Convert tenant_id to number
        if ('tenant_id' in data) {
            data.tenant_id = parseInt(data.tenant_id);
        }
        
        try {
            switch (this.currentSection) {
                case 'tenants':
                    if (this.currentEditId) {
                        await this.saveTenant(this.currentEditId, data);
                    } else {
                        await this.createTenant(data);
                    }
                    break;
                case 'domains':
                    if (this.currentEditId) {
                        await this.saveDomain(this.currentEditId, data);
                    } else {
                        await this.createDomain(data);
                    }
                    break;
                case 'users':
                    if (this.currentEditId) {
                        await this.saveUser(this.currentEditId, data);
                    } else {
                        await this.createUser(data);
                    }
                    break;
            }
            
            this.closeModal();
            this.loadSection(this.currentSection);
            this.showToast('success', 'Success', `${this.currentSection.slice(0, -1)} saved successfully`);
        } catch (error) {
            this.showToast('error', 'Error', error.message);
        }
    },
    
    /**
     * Confirm delete action
     */
    async confirmDelete() {
        try {
            switch (this.currentDeleteType) {
                case 'tenant':
                    await this.performDeleteTenant(this.currentDeleteId);
                    break;
                case 'domain':
                    await this.performDeleteDomain(this.currentDeleteId);
                    break;
                case 'user':
                    await this.performDeleteUser(this.currentDeleteId);
                    break;
            }
            
            this.closeDeleteModal();
            this.loadSection(this.currentSection);
            this.showToast('success', 'Deleted', `${this.currentDeleteType} deleted successfully`);
        } catch (error) {
            this.showToast('error', 'Error', error.message);
        }
    },
    
    // ==================== CRUD OPERATIONS ====================
    
    async createTenant(data) {
        await API.createTenant(data);
    },
    
    async saveTenant(id, data) {
        await API.updateTenant(id, data);
    },
    
    async performDeleteTenant(id) {
        await API.deleteTenant(id);
    },
    
    async createDomain(data) {
        await API.createDomain(data);
    },
    
    async saveDomain(id, data) {
        await API.updateDomain(id, data);
    },
    
    async performDeleteDomain(id) {
        await API.deleteDomain(id);
    },
    
    async createUser(data) {
        await API.createUser(data);
    },
    
    async saveUser(id, data) {
        await API.updateUser(id, data);
    },
    
    async performDeleteUser(id) {
        await API.deleteUser(id);
    },
    
    // ==================== FORM TEMPLATES ====================
    
    /**
     * Get tenant form HTML
     * @param {Object} tenant - Existing tenant data (for edit)
     * @returns {string} - Form HTML
     */
    getTenantForm(tenant = {}) {
        return `
            <form id="tenantForm">
                <div class="form-group">
                    <label for="name" class="required">Tenant Name</label>
                    <input type="text" id="name" name="name" value="${this.escapeHtml(tenant.name || '')}" required placeholder="e.g., Acme Corporation">
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="erp_base_url" class="required">ERP Base URL</label>
                        <input type="url" id="erp_base_url" name="erp_base_url" value="${this.escapeHtml(tenant.erp_base_url || '')}" required placeholder="https://erp.example.com">
                    </div>
                    <div class="form-group">
                        <label for="erp_company" class="required">ERP Company</label>
                        <input type="text" id="erp_company" name="erp_company" value="${this.escapeHtml(tenant.erp_company || '')}" required placeholder="e.g., DEMO">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="erp_auth_type">Auth Type</label>
                        <select id="erp_auth_type" name="erp_auth_type">
                            <option value="basic" ${tenant.erp_auth_type === 'basic' ? 'selected' : ''}>Basic</option>
                            <option value="oauth2" ${tenant.erp_auth_type === 'oauth2' ? 'selected' : ''}>OAuth2</option>
                            <option value="token" ${tenant.erp_auth_type === 'token' ? 'selected' : ''}>Token</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="erp_tabula_ini">Tabula INI</label>
                        <input type="text" id="erp_tabula_ini" name="erp_tabula_ini" value="${this.escapeHtml(tenant.erp_tabula_ini || 'tabula.ini')}" placeholder="tabula.ini">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="erp_admin_username">Admin Username</label>
                        <input type="text" id="erp_admin_username" name="erp_admin_username" value="${this.escapeHtml(tenant.erp_admin_username || '')}" placeholder="ERP admin username">
                    </div>
                    <div class="form-group">
                        <label for="erp_admin_password_or_token">Admin Password/Token</label>
                        <input type="password" id="erp_admin_password_or_token" name="erp_admin_password_or_token" placeholder="${tenant.id ? '(unchanged)' : 'ERP admin password'}">
                    </div>
                </div>
                
                <div class="form-group">
                    <button type="button" class="btn btn-secondary" id="validateCredentialsBtn" onclick="App.validateCredentials()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="margin-right: 6px; vertical-align: middle;">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        Validate Credentials
                    </button>
                    <span id="validateCredentialsResult" class="form-help" style="margin-left: 10px;"></span>
                </div>
                
                <div class="form-group">
                    <div class="toggle-wrapper">
                        <label class="toggle">
                            <input type="checkbox" name="is_active" ${tenant.is_active !== false ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                        <span class="toggle-label">Active</span>
                    </div>
                </div>
            </form>
        `;
    },
    
    /**
     * Get domain form HTML
     * @param {Object} domain - Existing domain data (for edit)
     * @returns {string} - Form HTML
     */
    getDomainForm(domain = {}) {
        const tenantOptions = this.tenants.map(t => 
            `<option value="${t.id}" ${domain.tenant_id === t.id ? 'selected' : ''}>${this.escapeHtml(t.name)}</option>`
        ).join('');
        
        return `
            <form id="domainForm">
                <div class="form-group">
                    <label for="domain" class="required">Domain</label>
                    <input type="text" id="domain" name="domain" value="${this.escapeHtml(domain.domain || '')}" required placeholder="e.g., example.com">
                    <span class="form-help">Email domain without @ symbol. A domain can be connected to multiple tenants.</span>
                </div>
                
                <div class="form-group">
                    <label for="tenant_id" class="required">Tenant</label>
                    <select id="tenant_id" name="tenant_id" required>
                        <option value="">Select a tenant</option>
                        ${tenantOptions}
                    </select>
                </div>
            </form>
        `;
    },
    
    /**
     * Get user form HTML
     * @param {Object} user - Existing user data (for edit)
     * @returns {string} - Form HTML
     */
    getUserForm(user = {}) {
        const isEdit = !!user.id;
        const tenantOptions = this.tenants.map(t => 
            `<option value="${t.id}">${this.escapeHtml(t.name)}</option>`
        ).join('');
        
        // For new users, show initial tenant selection
        const initialTenantSection = !isEdit ? `
                <div class="form-section">
                    <h4>Initial Tenant (Optional)</h4>
                    <p class="form-help">You can add more tenants after creating the user.</p>
                    
                    <div class="form-group">
                        <label for="tenant_id">Tenant</label>
                        <select id="tenant_id" name="tenant_id">
                            <option value="">No initial tenant</option>
                            ${tenantOptions}
                        </select>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="erp_username">ERP Username</label>
                            <input type="text" id="erp_username" name="erp_username" placeholder="ERP username for this tenant">
                        </div>
                        <div class="form-group">
                            <label for="erp_password_or_token">ERP Password/Token</label>
                            <input type="password" id="erp_password_or_token" name="erp_password_or_token" placeholder="ERP password">
                        </div>
                    </div>
                </div>
        ` : `
                <div class="form-section">
                    <p class="form-help">To manage tenant associations and ERP credentials, use the "Manage Tenants" button in the users table.</p>
                </div>
        `;
        
        return `
            <form id="userForm">
                <div class="form-row">
                    <div class="form-group">
                        <label for="email" class="required">Email</label>
                        <input type="email" id="email" name="email" value="${this.escapeHtml(user.email || '')}" required placeholder="user@example.com">
                    </div>
                    <div class="form-group">
                        <label for="display_name">Display Name</label>
                        <input type="text" id="display_name" name="display_name" value="${this.escapeHtml(user.display_name || '')}" placeholder="Display name">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="role">Role</label>
                        <select id="role" name="role">
                            <option value="user" ${user.role === 'user' || !user.role ? 'selected' : ''}>User</option>
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <div class="toggle-wrapper" style="margin-top: 28px;">
                            <label class="toggle">
                                <input type="checkbox" name="is_active" ${user.is_active !== false ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                            <span class="toggle-label">Active</span>
                        </div>
                    </div>
                </div>
                
                ${initialTenantSection}
            </form>
        `;
    },
    
    // ==================== USER-TENANT MANAGEMENT ====================
    
    /**
     * Open the manage tenants modal for a user
     * @param {number} userId - User ID
     */
    async manageUserTenants(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;
        
        this.currentUserForTenants = user;
        
        // Update modal title and user info
        document.getElementById('userTenantsModalTitle').textContent = 'Manage User Tenants';
        document.getElementById('userTenantsUserInfo').innerHTML = `User: <strong>${this.escapeHtml(user.email)}</strong>`;
        
        // Render tenant associations
        this.renderUserTenantsList();
        
        // Show modal
        document.getElementById('userTenantsModalOverlay').classList.add('active');
        document.body.style.overflow = 'hidden';
    },
    
    /**
     * Render the list of tenant associations for current user
     */
    renderUserTenantsList() {
        const container = document.getElementById('userTenantsList');
        const userTenants = this.currentUserForTenants?.tenants || [];
        
        if (userTenants.length === 0) {
            container.innerHTML = `
                <div class="empty-state small">
                    <p>No tenant associations yet. Click "Add Tenant" to connect this user to a tenant.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = userTenants.map(ut => `
            <div class="user-tenant-card ${ut.is_active ? '' : 'inactive'}">
                <div class="user-tenant-info">
                    <h4>${this.escapeHtml(ut.tenant_name || 'Unknown Tenant')}</h4>
                    <p>ERP Username: ${ut.erp_username ? this.escapeHtml(ut.erp_username) : '<em>Not set</em>'}</p>
                    <span class="status-badge ${ut.is_active ? 'active' : 'inactive'}">
                        ${ut.is_active ? 'Active' : 'Inactive'}
                    </span>
                </div>
                <div class="user-tenant-actions">
                    <button class="btn-icon edit" onclick="App.editUserTenant(${ut.tenant_id})" title="Edit">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="btn-icon delete" onclick="App.removeUserTenantConfirm(${ut.tenant_id})" title="Remove">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');
    },
    
    /**
     * Close the user tenants modal
     */
    closeUserTenantsModal() {
        document.getElementById('userTenantsModalOverlay').classList.remove('active');
        document.body.style.overflow = '';
        this.currentUserForTenants = null;
        // Reload users to reflect any changes
        this.loadUsers();
    },
    
    /**
     * Open form to add a new tenant association
     */
    openAddUserTenantForm() {
        this.currentEditUserTenant = null;
        
        // Get tenants not already associated with this user
        const existingTenantIds = (this.currentUserForTenants?.tenants || []).map(ut => ut.tenant_id);
        const availableTenants = this.tenants.filter(t => !existingTenantIds.includes(t.id));
        
        if (availableTenants.length === 0) {
            this.showToast('warning', 'No Available Tenants', 'This user is already associated with all tenants.');
            return;
        }
        
        document.getElementById('userTenantFormModalTitle').textContent = 'Add Tenant';
        document.getElementById('userTenantFormModalBody').innerHTML = this.getUserTenantForm(null, availableTenants);
        document.getElementById('userTenantFormModalOverlay').classList.add('active');
    },
    
    /**
     * Open form to edit an existing tenant association
     * @param {number} tenantId - Tenant ID
     */
    editUserTenant(tenantId) {
        const userTenant = (this.currentUserForTenants?.tenants || []).find(ut => ut.tenant_id === tenantId);
        if (!userTenant) return;
        
        this.currentEditUserTenant = userTenant;
        
        document.getElementById('userTenantFormModalTitle').textContent = 'Edit Tenant Association';
        document.getElementById('userTenantFormModalBody').innerHTML = this.getUserTenantForm(userTenant, null);
        document.getElementById('userTenantFormModalOverlay').classList.add('active');
    },
    
    /**
     * Get user-tenant form HTML
     * @param {Object} userTenant - Existing association (for edit)
     * @param {Array} availableTenants - Available tenants (for add)
     * @returns {string} - Form HTML
     */
    getUserTenantForm(userTenant = null, availableTenants = null) {
        const isEdit = !!userTenant;
        
        const tenantSelect = isEdit ? `
            <div class="form-group">
                <label>Tenant</label>
                <input type="text" value="${this.escapeHtml(userTenant.tenant_name || 'Unknown')}" disabled>
                <input type="hidden" name="tenant_id" value="${userTenant.tenant_id}">
            </div>
        ` : `
            <div class="form-group">
                <label for="tenant_id" class="required">Tenant</label>
                <select id="tenant_id" name="tenant_id" required>
                    <option value="">Select a tenant</option>
                    ${availableTenants.map(t => `<option value="${t.id}">${this.escapeHtml(t.name)}</option>`).join('')}
                </select>
            </div>
        `;
        
        return `
            <form id="userTenantForm">
                ${tenantSelect}
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="erp_username">ERP Username</label>
                        <input type="text" id="erp_username" name="erp_username" value="${this.escapeHtml(userTenant?.erp_username || '')}" placeholder="ERP username for this tenant">
                    </div>
                    <div class="form-group">
                        <label for="erp_password_or_token">ERP Password/Token</label>
                        <input type="password" id="erp_password_or_token" name="erp_password_or_token" placeholder="${isEdit ? '(unchanged)' : 'ERP password'}">
                    </div>
                </div>
                
                <div class="form-group">
                    <div class="toggle-wrapper">
                        <label class="toggle">
                            <input type="checkbox" name="is_active" ${userTenant?.is_active !== false ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                        <span class="toggle-label">Active for this tenant</span>
                    </div>
                </div>
            </form>
        `;
    },
    
    /**
     * Close the user tenant form modal
     */
    closeUserTenantFormModal() {
        document.getElementById('userTenantFormModalOverlay').classList.remove('active');
        this.currentEditUserTenant = null;
    },
    
    /**
     * Save user-tenant association (add or update)
     */
    async saveUserTenant() {
        const form = document.querySelector('#userTenantForm');
        if (!form) return;
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Convert checkbox
        data.is_active = data.is_active === 'on';
        
        // Convert tenant_id to number
        data.tenant_id = parseInt(data.tenant_id);
        
        // Remove empty password field for updates
        if (this.currentEditUserTenant && !data.erp_password_or_token) {
            delete data.erp_password_or_token;
        }
        
        try {
            if (this.currentEditUserTenant) {
                // Update existing
                await API.updateUserTenant(this.currentUserForTenants.id, data.tenant_id, data);
                this.showToast('success', 'Success', 'Tenant association updated');
            } else {
                // Add new
                await API.addUserTenant(this.currentUserForTenants.id, data);
                this.showToast('success', 'Success', 'Tenant added to user');
            }
            
            // Refresh user data
            await this.refreshCurrentUserTenants();
            this.closeUserTenantFormModal();
        } catch (error) {
            this.showToast('error', 'Error', error.message);
        }
    },
    
    /**
     * Confirm removal of a tenant association
     * @param {number} tenantId - Tenant ID
     */
    removeUserTenantConfirm(tenantId) {
        const userTenant = (this.currentUserForTenants?.tenants || []).find(ut => ut.tenant_id === tenantId);
        if (!userTenant) return;
        
        if (confirm(`Remove "${userTenant.tenant_name}" from this user?`)) {
            this.removeUserTenant(tenantId);
        }
    },
    
    /**
     * Remove a tenant association from the current user
     * @param {number} tenantId - Tenant ID
     */
    async removeUserTenant(tenantId) {
        try {
            await API.removeUserTenant(this.currentUserForTenants.id, tenantId);
            this.showToast('success', 'Removed', 'Tenant removed from user');
            await this.refreshCurrentUserTenants();
        } catch (error) {
            this.showToast('error', 'Error', error.message);
        }
    },
    
    /**
     * Refresh the current user's tenant associations
     */
    async refreshCurrentUserTenants() {
        if (!this.currentUserForTenants) return;
        
        try {
            const tenants = await API.getUserTenants(this.currentUserForTenants.id);
            this.currentUserForTenants.tenants = tenants;
            this.renderUserTenantsList();
            
            // Also update in the users array
            const userIndex = this.users.findIndex(u => u.id === this.currentUserForTenants.id);
            if (userIndex !== -1) {
                this.users[userIndex].tenants = tenants;
            }
        } catch (error) {
            console.error('Failed to refresh user tenants:', error);
        }
    },
    
    // ==================== UTILITIES ====================
    
    /**
     * Update tenant filter dropdowns
     */
    updateTenantFilters() {
        const options = this.tenants.map(t => 
            `<option value="${t.id}">${this.escapeHtml(t.name)}</option>`
        ).join('');
        
        const defaultOption = '<option value="">All Tenants</option>';
        
        document.getElementById('domainsTenantFilter').innerHTML = defaultOption + options;
        document.getElementById('usersTenantFilter').innerHTML = defaultOption + options;
    },
    
    /**
     * Show toast notification
     * @param {string} type - Toast type (success, error, warning, info)
     * @param {string} title - Toast title
     * @param {string} message - Toast message
     */
    showToast(type, title, message) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>',
            error: '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>',
            warning: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>',
            info: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>'
        };
        
        toast.innerHTML = `
            <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${icons[type]}
            </svg>
            <div class="toast-content">
                <div class="toast-title">${this.escapeHtml(title)}</div>
                <div class="toast-message">${this.escapeHtml(message)}</div>
            </div>
            <button class="toast-close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        `;
        
        container.appendChild(toast);
        
        // Close button handler
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 300);
        });
        
        // Auto remove after duration
        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.add('toast-exit');
                setTimeout(() => toast.remove(), 300);
            }
        }, CONFIG.TOAST_DURATION);
    },
    
    /**
     * Format date string
     * @param {string} dateStr - ISO date string
     * @returns {string} - Formatted date
     */
    formatDate(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },
    
    /**
     * Escape HTML to prevent XSS
     * @param {string} str - String to escape
     * @returns {string} - Escaped string
     */
    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },
    
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} - Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
