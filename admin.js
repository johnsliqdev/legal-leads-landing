// Admin authentication

// Check if user is logged in
function isLoggedIn() {
    return sessionStorage.getItem('adminLoggedIn') === 'true';
}

// Handle admin login
document.getElementById('adminLoginForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const loginError = document.getElementById('loginError');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    loginError.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    try {
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'login', username, password })
        });

        if (res.ok) {
            sessionStorage.setItem('adminLoggedIn', 'true');
            sessionStorage.setItem('adminApiToken', password);
            window.location.href = 'admin-dashboard.html';
        } else {
            loginError.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Login';
        }
    } catch (err) {
        console.error('Login error:', err);
        loginError.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';
    }
});
