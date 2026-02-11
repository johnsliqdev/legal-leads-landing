// Admin authentication and settings management
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'sliq2024'
};

// CPQL target value (default $700)
let cpqlTarget = 700;

// Check if user is logged in
function isLoggedIn() {
    return sessionStorage.getItem('adminLoggedIn') === 'true';
}

// Handle admin login
document.getElementById('adminLoginForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        sessionStorage.setItem('adminLoggedIn', 'true');
        window.location.href = 'admin-dashboard.html';
    } else {
        document.getElementById('loginError').style.display = 'block';
    }
});

// Load saved CPQL target from localStorage
function loadCpqlTarget() {
    const saved = localStorage.getItem('cpqlTarget');
    if (saved) {
        cpqlTarget = parseFloat(saved);
    }
    return cpqlTarget;
}

// Save CPQL target to localStorage
function saveCpqlTarget(value) {
    cpqlTarget = value;
    localStorage.setItem('cpqlTarget', value.toString());
}

// Initialize on page load
loadCpqlTarget();
