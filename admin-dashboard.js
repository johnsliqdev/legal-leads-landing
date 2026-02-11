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

// Load submissions from localStorage ONLY
async function loadSubmissions() {
    try {
        // Only load from localStorage
        const localData = JSON.parse(localStorage.getItem('submissions') || '[]');
        console.log('Loaded from localStorage:', localData);
        return localData;
    } catch (error) {
        console.error('Error loading submissions:', error);
        return [];
    }
}

// Display submissions
async function displaySubmissions() {
    const submissions = await loadSubmissions();
    const submissionsList = document.getElementById('submissionsList');
    
    if (submissions.length === 0) {
        submissionsList.innerHTML = '<div class="no-submissions">No submissions yet</div>';
        return;
    }
    
    // Sort submissions by timestamp (newest first)
    const sortedSubmissions = submissions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    submissionsList.innerHTML = sortedSubmissions.map(submission => `
        <div class="submission-item">
            <div class="submission-header">
                <div class="submission-date">${submission.date || new Date().toLocaleDateString()} at ${submission.time || new Date().toLocaleTimeString()}</div>
                <div class="submission-id">ID: ${submission.id || Date.now()}</div>
            </div>
            <div class="submission-details">
                <div class="submission-field">
                    <div class="submission-label">Name:</div>
                    <div class="submission-value">${submission.firstName || ''} ${submission.lastName || ''}</div>
                </div>
                <div class="submission-field">
                    <div class="submission-label">Email:</div>
                    <div class="submission-value">${submission.email || ''}</div>
                </div>
                <div class="submission-field">
                    <div class="submission-label">Phone:</div>
                    <div class="submission-value">${submission.phone || ''}</div>
                </div>
                <div class="submission-field">
                    <div class="submission-label">Law Firm:</div>
                    <div class="submission-value">${submission.lawFirm || ''}</div>
                </div>
                <div class="submission-field">
                    <div class="submission-label">Current CPQL:</div>
                    <div class="submission-value">${submission.currentCpl || ''}</div>
                </div>
                <div class="submission-field">
                    <div class="submission-label">Potential Savings:</div>
                    <div class="submission-value">${submission.savings || ''}</div>
                </div>
            </div>
        </div>
    `).join('');
}

// Update display
async function updateDisplay() {
    const target = loadCpqlTarget();
    document.getElementById('cpqlTarget').value = target;
    document.getElementById('currentCpqlDisplay').textContent = target;
    await displaySubmissions();
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
    if (confirm('Are you sure you want to clear all submissions? This action cannot be undone.')) {
        // Clear localStorage ONLY
        localStorage.removeItem('submissions');
        
        showNotification('All submissions cleared', 'success');
        
        // Refresh display
        await displaySubmissions();
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
