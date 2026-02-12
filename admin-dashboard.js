// Admin dashboard functionality
let cpqlTarget = 700;

// Check authentication
function checkAuth() {
    if (sessionStorage.getItem('adminLoggedIn') !== 'true') {
        window.location.href = 'admin.html';
        return false;
    }
    return true;
}

// Load CPQL target from localStorage
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

// Load submissions from localStorage
async function loadSubmissions() {
    const token = sessionStorage.getItem('adminApiToken') || '';
    const res = await fetch('/api/leads', {
        method: 'GET',
        headers: {
            'x-admin-token': token
        }
    });

    if (!res.ok) {
        throw new Error(`Failed to load submissions: ${res.status}`);
    }

    return await res.json();
}

// Display submissions
async function displaySubmissions() {
    const submissionsList = document.getElementById('submissionsList');
    let submissions = [];

    try {
        submissions = await loadSubmissions();
    } catch (err) {
        console.error(err);
        submissionsList.innerHTML = '<div class="no-submissions">Unable to load submissions (DB).</div>';
        return;
    }
    
    if (submissions.length === 0) {
        submissionsList.innerHTML = '<div class="no-submissions">No submissions yet</div>';
        return;
    }
    
    const sortedSubmissions = submissions;
    
    submissionsList.innerHTML = sortedSubmissions.map(submission => `
        <div class="submission-item">
            <div class="submission-header">
                <div class="submission-date">${new Date(submission.created_at).toLocaleString()}</div>
                <div class="submission-id">ID: ${submission.id}</div>
            </div>
            <div class="submission-details">
                <div class="submission-field">
                    <div class="submission-label">Name:</div>
                    <div class="submission-value">${submission.first_name} ${submission.last_name}</div>
                </div>
                <div class="submission-field">
                    <div class="submission-label">Email:</div>
                    <div class="submission-value">${submission.email}</div>
                </div>
                <div class="submission-field">
                    <div class="submission-label">Phone:</div>
                    <div class="submission-value">${submission.phone}</div>
                </div>
                <div class="submission-field">
                    <div class="submission-label">Law Firm:</div>
                    <div class="submission-value">${submission.law_firm}</div>
                </div>
                <div class="submission-field">
                    <div class="submission-label">Current CPQL:</div>
                    <div class="submission-value">${submission.calc_current_cpql || ''}</div>
                </div>
                <div class="submission-field">
                    <div class="submission-label">Potential Savings:</div>
                    <div class="submission-value">${submission.calc_monthly_savings || ''}</div>
                </div>
            </div>
        </div>
    `).join('');
}

// Update display
function updateDisplay() {
    const target = loadCpqlTarget();
    document.getElementById('cpqlTarget').value = target;
    document.getElementById('currentCpqlDisplay').textContent = target;
    displaySubmissions();
}

// Handle CPQL form submission
document.getElementById('cpqlForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const newTarget = parseFloat(document.getElementById('cpqlTarget').value);
    
    if (newTarget >= 0) {
        saveCpqlTarget(newTarget);
        updateDisplay();
        
        // Show success message
        const successMsg = document.getElementById('updateSuccess');
        successMsg.style.display = 'block';
        
        // Hide success message after 3 seconds
        setTimeout(() => {
            successMsg.style.display = 'none';
        }, 3000);
    }
});

// Handle refresh submissions
document.getElementById('refreshSubmissions')?.addEventListener('click', async function() {
    await displaySubmissions();
    showNotification('Submissions refreshed', 'success');
});

// Handle clear submissions
document.getElementById('clearSubmissions')?.addEventListener('click', async function() {
    if (!confirm('Are you sure you want to clear all submissions? This will delete from the database. This action cannot be undone.')) {
        return;
    }

    try {
        const token = sessionStorage.getItem('adminApiToken') || '';
        const res = await fetch('/api/leads', {
            method: 'DELETE',
            headers: {
                'x-admin-token': token
            }
        });
        if (!res.ok) throw new Error(`Failed to clear: ${res.status}`);

        await displaySubmissions();
        showNotification('All submissions cleared', 'success');
    } catch (err) {
        console.error(err);
        showNotification('Failed to clear submissions', 'error');
    }
});

// Show notification
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 10px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 300px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    `;
    
    if (type === 'success') {
        notification.style.background = 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)';
    } else {
        notification.style.background = 'linear-gradient(135deg, #ff006e 0%, #ff4081 100%)';
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Handle logout
document.getElementById('logoutBtn')?.addEventListener('click', function(e) {
    e.preventDefault();
    sessionStorage.removeItem('adminLoggedIn');
    window.location.href = 'admin.html';
});

// Initialize on page load
if (checkAuth()) {
    updateDisplay();
}
