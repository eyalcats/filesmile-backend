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
     * Load tenants from API or mock data
     */
    async loadTenants() {
        const search = document.getElementById('tenantsSearch').value;
        const status = document.getElementById('tenantsStatusFilter').value;
        
        try {
            // Try to load from API
            this.tenants = await API.getTenants({ search, status });
        } catch (error) {
            // Use mock data if API fails
            console.warn('API unavailable, using mock data:', error.message);
            this.tenants = this.getMockTenants();
            
            // Filter mock data
            if (search) {
                this.tenants = this.tenants.filter(t => 
                    t.name.toLowerCase().includes(search.toLowerCase()) ||
                    t.erp_base_url.toLowerCase().includes(search.toLowerCase())
                );
            }
            if (status) {
                const isActive = status === 'active';
                this.tenants = this.tenants.filter(t => t.is_active === isActive);
            }
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
    
    // ==================== DOMAINS ====================
    
    /**
     * Load domains from API or mock data
     */
    async loadDomains() {
        const search = document.getElementById('domainsSearch').value;
        const tenantId = document.getElementById('domainsTenantFilter').value;
        
        try {
            this.domains = await API.getDomains({ search, tenant_id: tenantId });
        } catch (error) {
            console.warn('API unavailable, using mock data:', error.message);
            this.domains = this.getMockDomains();
            
            if (search) {
                this.domains = this.domains.filter(d => 
                    d.domain.toLowerCase().includes(search.toLowerCase())
                );
            }
            if (tenantId) {
                this.domains = this.domains.filter(d => d.tenant_id === parseInt(tenantId));
            }
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
     * Load users from API or mock data
     */
    async loadUsers() {
        const search = document.getElementById('usersSearch').value;
        const tenantId = document.getElementById('usersTenantFilter').value;
        const status = document.getElementById('usersStatusFilter').value;
        
        try {
            this.users = await API.getUsers({ search, tenant_id: tenantId, status });
        } catch (error) {
            console.warn('API unavailable, using mock data:', error.message);
            this.users = this.getMockUsers();
            
            if (search) {
                this.users = this.users.filter(u => 
                    u.email.toLowerCase().includes(search.toLowerCase()) ||
                    (u.display_name && u.display_name.toLowerCase().includes(search.toLowerCase()))
                );
            }
            if (tenantId) {
                this.users = this.users.filter(u => u.tenant_id === parseInt(tenantId));
            }
            if (status) {
                const isActive = status === 'active';
                this.users = this.users.filter(u => u.is_active === isActive);
            }
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
            const tenant = this.tenants.find(t => t.id === user.tenant_id);
            return `
                <tr>
                    <td>${user.id}</td>
                    <td><strong>${this.escapeHtml(user.email)}</strong></td>
                    <td>${user.display_name ? this.escapeHtml(user.display_name) : '-'}</td>
                    <td>${tenant ? this.escapeHtml(tenant.name) : 'Unknown'}</td>
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
        try {
            await API.createTenant(data);
        } catch (error) {
            // Mock create
            const newTenant = {
                id: Math.max(...this.tenants.map(t => t.id), 0) + 1,
                ...data,
                is_active: data.is_active !== false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            this.tenants.push(newTenant);
        }
    },
    
    async saveTenant(id, data) {
        try {
            await API.updateTenant(id, data);
        } catch (error) {
            // Mock update
            const index = this.tenants.findIndex(t => t.id === id);
            if (index !== -1) {
                this.tenants[index] = { ...this.tenants[index], ...data, updated_at: new Date().toISOString() };
            }
        }
    },
    
    async performDeleteTenant(id) {
        try {
            await API.deleteTenant(id);
        } catch (error) {
            // Mock delete
            this.tenants = this.tenants.filter(t => t.id !== id);
            this.domains = this.domains.filter(d => d.tenant_id !== id);
            this.users = this.users.filter(u => u.tenant_id !== id);
        }
    },
    
    async createDomain(data) {
        try {
            await API.createDomain(data);
        } catch (error) {
            const newDomain = {
                id: Math.max(...this.domains.map(d => d.id), 0) + 1,
                ...data,
                created_at: new Date().toISOString()
            };
            this.domains.push(newDomain);
        }
    },
    
    async saveDomain(id, data) {
        try {
            await API.updateDomain(id, data);
        } catch (error) {
            const index = this.domains.findIndex(d => d.id === id);
            if (index !== -1) {
                this.domains[index] = { ...this.domains[index], ...data };
            }
        }
    },
    
    async performDeleteDomain(id) {
        try {
            await API.deleteDomain(id);
        } catch (error) {
            this.domains = this.domains.filter(d => d.id !== id);
        }
    },
    
    async createUser(data) {
        try {
            await API.createUser(data);
        } catch (error) {
            const newUser = {
                id: Math.max(...this.users.map(u => u.id), 0) + 1,
                ...data,
                is_active: data.is_active !== false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            this.users.push(newUser);
        }
    },
    
    async saveUser(id, data) {
        try {
            await API.updateUser(id, data);
        } catch (error) {
            const index = this.users.findIndex(u => u.id === id);
            if (index !== -1) {
                this.users[index] = { ...this.users[index], ...data, updated_at: new Date().toISOString() };
            }
        }
    },
    
    async performDeleteUser(id) {
        try {
            await API.deleteUser(id);
        } catch (error) {
            this.users = this.users.filter(u => u.id !== id);
        }
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
                    <span class="form-help">Email domain without @ symbol</span>
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
        const tenantOptions = this.tenants.map(t => 
            `<option value="${t.id}" ${user.tenant_id === t.id ? 'selected' : ''}>${this.escapeHtml(t.name)}</option>`
        ).join('');
        
        return `
            <form id="userForm">
                <div class="form-row">
                    <div class="form-group">
                        <label for="email" class="required">Email</label>
                        <input type="email" id="email" name="email" value="${this.escapeHtml(user.email || '')}" required placeholder="user@example.com">
                    </div>
                    <div class="form-group">
                        <label for="display_name">Display Name</label>
                        <input type="text" id="display_name" name="display_name" value="${this.escapeHtml(user.display_name || '')}" placeholder="John Doe">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="tenant_id" class="required">Tenant</label>
                        <select id="tenant_id" name="tenant_id" required>
                            <option value="">Select a tenant</option>
                            ${tenantOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="role">Role</label>
                        <select id="role" name="role">
                            <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="erp_username">ERP Username</label>
                        <input type="text" id="erp_username" name="erp_username" value="${this.escapeHtml(user.erp_username || '')}" placeholder="ERP username">
                    </div>
                    <div class="form-group">
                        <label for="erp_password_or_token">ERP Password/Token</label>
                        <input type="password" id="erp_password_or_token" name="erp_password_or_token" placeholder="${user.id ? '(unchanged)' : 'ERP password'}">
                    </div>
                </div>
                
                <div class="form-group">
                    <div class="toggle-wrapper">
                        <label class="toggle">
                            <input type="checkbox" name="is_active" ${user.is_active !== false ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                        <span class="toggle-label">Active</span>
                    </div>
                </div>
            </form>
        `;
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
    
    // ==================== MOCK DATA ====================
    
    getMockTenants() {
        return [
            {
                id: 1,
                name: 'Acme Corporation',
                erp_base_url: 'https://erp.acme.com',
                erp_auth_type: 'basic',
                erp_admin_username: 'admin',
                erp_company: 'ACME',
                erp_tabula_ini: 'tabula.ini',
                is_active: true,
                created_at: '2024-01-15T10:30:00Z',
                updated_at: '2024-01-15T10:30:00Z'
            },
            {
                id: 2,
                name: 'Tech Solutions Ltd',
                erp_base_url: 'https://priority.techsolutions.com',
                erp_auth_type: 'oauth2',
                erp_admin_username: 'sysadmin',
                erp_company: 'TECH',
                erp_tabula_ini: 'tabula.ini',
                is_active: true,
                created_at: '2024-02-20T14:15:00Z',
                updated_at: '2024-02-20T14:15:00Z'
            },
            {
                id: 3,
                name: 'Global Industries',
                erp_base_url: 'https://erp.globalind.com',
                erp_auth_type: 'basic',
                erp_admin_username: 'admin',
                erp_company: 'GLOB',
                erp_tabula_ini: 'tabula.ini',
                is_active: false,
                created_at: '2024-03-10T09:00:00Z',
                updated_at: '2024-03-10T09:00:00Z'
            }
        ];
    },
    
    getMockDomains() {
        return [
            { id: 1, tenant_id: 1, domain: 'acme.com', created_at: '2024-01-15T10:30:00Z' },
            { id: 2, tenant_id: 1, domain: 'acme.co.il', created_at: '2024-01-15T10:35:00Z' },
            { id: 3, tenant_id: 2, domain: 'techsolutions.com', created_at: '2024-02-20T14:15:00Z' },
            { id: 4, tenant_id: 3, domain: 'globalind.com', created_at: '2024-03-10T09:00:00Z' }
        ];
    },
    
    getMockUsers() {
        return [
            {
                id: 1,
                tenant_id: 1,
                email: 'john.doe@acme.com',
                display_name: 'John Doe',
                role: 'admin',
                erp_username: 'jdoe',
                is_active: true,
                created_at: '2024-01-16T08:00:00Z',
                updated_at: '2024-01-16T08:00:00Z'
            },
            {
                id: 2,
                tenant_id: 1,
                email: 'jane.smith@acme.com',
                display_name: 'Jane Smith',
                role: 'user',
                erp_username: 'jsmith',
                is_active: true,
                created_at: '2024-01-17T09:30:00Z',
                updated_at: '2024-01-17T09:30:00Z'
            },
            {
                id: 3,
                tenant_id: 2,
                email: 'mike.wilson@techsolutions.com',
                display_name: 'Mike Wilson',
                role: 'admin',
                erp_username: 'mwilson',
                is_active: true,
                created_at: '2024-02-21T11:00:00Z',
                updated_at: '2024-02-21T11:00:00Z'
            },
            {
                id: 4,
                tenant_id: 3,
                email: 'sarah.jones@globalind.com',
                display_name: 'Sarah Jones',
                role: 'user',
                erp_username: 'sjones',
                is_active: false,
                created_at: '2024-03-11T14:00:00Z',
                updated_at: '2024-03-11T14:00:00Z'
            }
        ];
    }
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
