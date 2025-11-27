/**
 * Login Page Script
 * 
 * Handles login form submission and UI interactions.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Redirect if already logged in
    Auth.redirectIfAuthenticated();
    
    // DOM Elements
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const rememberMeCheckbox = document.getElementById('rememberMe');
    const loginBtn = document.getElementById('loginBtn');
    const loginError = document.getElementById('loginError');
    const togglePasswordBtn = document.querySelector('.toggle-password');
    
    // Check if remember me was previously set
    if (localStorage.getItem(CONFIG.STORAGE_KEYS.REMEMBER_ME)) {
        rememberMeCheckbox.checked = true;
    }
    
    // Toggle password visibility
    togglePasswordBtn.addEventListener('click', function() {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        
        // Update icon
        const eyeIcon = this.querySelector('.eye-icon');
        if (type === 'text') {
            eyeIcon.innerHTML = `
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
            `;
        } else {
            eyeIcon.innerHTML = `
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            `;
        }
    });
    
    // Handle form submission
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        const rememberMe = rememberMeCheckbox.checked;
        
        // Validate inputs
        if (!username || !password) {
            showError('Please enter both username and password');
            return;
        }
        
        // Show loading state
        setLoading(true);
        hideError();
        
        try {
            await Auth.login(username, password, rememberMe);
            
            // Redirect to dashboard
            window.location.href = 'dashboard.html';
        } catch (error) {
            showError(error.message || 'Login failed. Please try again.');
            setLoading(false);
        }
    });
    
    /**
     * Show error message
     * @param {string} message - Error message to display
     */
    function showError(message) {
        loginError.textContent = message;
        loginError.classList.remove('hidden');
    }
    
    /**
     * Hide error message
     */
    function hideError() {
        loginError.classList.add('hidden');
    }
    
    /**
     * Set loading state
     * @param {boolean} loading - Whether to show loading state
     */
    function setLoading(loading) {
        const btnText = loginBtn.querySelector('.btn-text');
        const btnLoader = loginBtn.querySelector('.btn-loader');
        
        if (loading) {
            loginBtn.disabled = true;
            btnText.classList.add('hidden');
            btnLoader.classList.remove('hidden');
        } else {
            loginBtn.disabled = false;
            btnText.classList.remove('hidden');
            btnLoader.classList.add('hidden');
        }
    }
    
    // Handle Enter key in inputs
    usernameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            passwordInput.focus();
        }
    });
});
