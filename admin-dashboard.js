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

// Load CPQL target from DB
async function loadCpqlTarget() {
    const res = await fetch('/api/settings', { method: 'GET' });
    if (!res.ok) {
        throw new Error(`Failed to load CPQL target: ${res.status}`);
    }

    const data = await res.json();
    const value = Number(data?.cpqlTarget);
    if (Number.isFinite(value)) {
        cpqlTarget = value;
    }
    return cpqlTarget;
}

// Save CPQL target to DB (admin only)
async function saveCpqlTarget(value) {
    const token = sessionStorage.getItem('adminApiToken') || '';
    const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'x-admin-token': token
        },
        body: JSON.stringify({ cpqlTarget: value })
    });

    if (!res.ok) {
        throw new Error(`Failed to save CPQL target: ${res.status}`);
    }

    const data = await res.json();
    const next = Number(data?.cpqlTarget);
    if (Number.isFinite(next)) {
        cpqlTarget = next;
    } else {
        cpqlTarget = value;
    }

    return cpqlTarget;
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
    
    submissionsList.innerHTML = sortedSubmissions.map(submission => {
        const val = (v) => v || '—';
        const money = (v) => v ? `$${Number(v).toLocaleString()}` : '—';
        const pct = (v) => v ? `${v}%` : '—';
        const duration = (seconds) => {
            if (!seconds || seconds === 0) return '—';
            const m = Math.floor(seconds / 60);
            const s = seconds % 60;
            return m > 0 ? `${m}m ${s}s` : `${s}s`;
        };
        const yesNo = (v) => {
            if (!v) return '—';
            return v === 'yes' ? 'Yes' : v === 'no' ? 'No' : v;
        };
        const budget = (v) => {
            if (!v) return '—';
            return v === '10k' ? '$10,000/mo' : v === '5k' ? '$5,000/mo' : v;
        };

        return `
        <div class="submission-item">
            <div class="submission-header">
                <div class="submission-date">${new Date(submission.created_at).toLocaleString()}</div>
                <div class="submission-id">ID: ${submission.id}${submission.requested_callback ? ' <span style="color: #00ff88; font-weight: 600;">CALLBACK REQUESTED</span>' : ''}</div>
            </div>
            <div class="submission-details">
                <div class="submission-section-label">Contact Info</div>
                <div class="submission-field">
                    <div class="submission-label">Email:</div>
                    <div class="submission-value">${val(submission.email)}</div>
                </div>
                <div class="submission-field">
                    <div class="submission-label">Phone:</div>
                    <div class="submission-value">${val(submission.phone)}</div>
                </div>
                <div class="submission-field">
                    <div class="submission-label">Website:</div>
                    <div class="submission-value">${val(submission.website)}</div>
                </div>

                <div class="submission-section-label">Calculator Results</div>
                <div class="submission-field">
                    <div class="submission-label">Current Monthly Spend:</div>
                    <div class="submission-value">${money(submission.calc_current_monthly_spend)}</div>
                </div>
                <div class="submission-field">
                    <div class="submission-label">Current CPQL:</div>
                    <div class="submission-value">${money(submission.calc_current_cpql)}</div>
                </div>
                <div class="submission-field">
                    <div class="submission-label">Monthly Leads:</div>
                    <div class="submission-value">${val(submission.calc_leads_count)}</div>
                </div>
                <div class="submission-field">
                    <div class="submission-label">CPQL Reduction:</div>
                    <div class="submission-value">${pct(submission.calc_cpql_reduction)}</div>
                </div>

                <div class="submission-section-label">Qualification</div>
                <div class="submission-field">
                    <div class="submission-label">Meta Budget Commitment:</div>
                    <div class="submission-value">${budget(submission.meta_budget_commitment)}</div>
                </div>
                <div class="submission-field">
                    <div class="submission-label">Dedicated Intake:</div>
                    <div class="submission-value">${yesNo(submission.dedicated_intake)}</div>
                </div>
                <div class="submission-field">
                    <div class="submission-label">Uses CRM:</div>
                    <div class="submission-value">${yesNo(submission.uses_crm)}</div>
                </div>
                <div class="submission-field">
                    <div class="submission-label">Firm Differentiator:</div>
                    <div class="submission-value">${val(submission.firm_differentiator)}</div>
                </div>

                <div class="submission-section-label">Video Engagement</div>
                <div class="submission-field">
                    <div class="submission-label">Watch Duration:</div>
                    <div class="submission-value">${duration(submission.video_watch_seconds)}</div>
                </div>
                <div class="submission-field">
                    <div class="submission-label">Watch Completion:</div>
                    <div class="submission-value">${submission.video_watch_percent ? submission.video_watch_percent + '%' : '—'}</div>
                </div>
            </div>
        </div>
    `}).join('');
}

// Update display
async function updateDisplay() {
    try {
        const target = await loadCpqlTarget();
        document.getElementById('cpqlTarget').value = target;
        document.getElementById('currentCpqlDisplay').textContent = target;
    } catch (err) {
        console.error(err);
        showNotification('Failed to load CPQL target', 'error');
    }

    await displaySubmissions();
}

// Handle CPQL form submission
document.getElementById('cpqlForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const newTarget = parseFloat(document.getElementById('cpqlTarget').value);
    
    if (newTarget >= 0) {
        try {
            await saveCpqlTarget(newTarget);
            await updateDisplay();
        } catch (err) {
            console.error(err);
            showNotification('Failed to update CPQL target', 'error');
            return;
        }
        
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
    sessionStorage.removeItem('adminApiToken');
    window.location.href = 'admin.html';
});

// Change password modal
const changePasswordModal = document.getElementById('changePasswordModal');
const changePasswordBtn = document.getElementById('changePasswordBtn');
const closePasswordModal = document.getElementById('closePasswordModal');

changePasswordBtn?.addEventListener('click', () => {
    changePasswordModal.style.display = 'block';
});

closePasswordModal?.addEventListener('click', () => {
    changePasswordModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === changePasswordModal) {
        changePasswordModal.style.display = 'none';
    }
});

// Handle change password form
document.getElementById('changePasswordForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
        showNotification('New passwords do not match', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showNotification('Password must be at least 6 characters', 'error');
        return;
    }

    const token = sessionStorage.getItem('adminApiToken') || '';

    try {
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-token': token
            },
            body: JSON.stringify({
                action: 'changePassword',
                currentPassword,
                newPassword
            })
        });

        if (!res.ok) {
            const data = await res.json();
            if (data.error === 'current_password_incorrect') {
                showNotification('Current password is incorrect', 'error');
            } else {
                showNotification('Failed to change password', 'error');
            }
            return;
        }

        // Update stored token
        sessionStorage.setItem('adminApiToken', newPassword);

        // Reset form and close modal
        this.reset();
        changePasswordModal.style.display = 'none';
        showNotification('Password changed successfully', 'success');
    } catch (err) {
        console.error(err);
        showNotification('Failed to change password', 'error');
    }
});

// Content management fields mapping: formId -> contentKey
const contentFields = {
    contentPageTitle: 'pageTitle',
    contentMetaDescription: 'metaDescription',
    contentHeroTitle: 'heroTitle',
    contentHeroSubtitle: 'heroSubtitle',
    contentGuaranteeHeading: 'guaranteeHeading',
    contentGuaranteeDesc: 'guaranteeDesc',
    contentCaseStudyHeading: 'caseStudyHeading',
    contentCaseStudyDesc: 'caseStudyDesc',
    contentDisclaimerText: 'disclaimerText',
    contentFooterText: 'footerText',
    contentSiteUrl: 'siteUrl',
    contentLlmsDescription: 'llmsDescription',
    contentLlmsTopics: 'llmsTopics'
};

// Load content from API
async function loadContent() {
    try {
        const res = await fetch('/api/content', { method: 'GET' });
        if (!res.ok) return;
        const content = await res.json();

        for (const [formId, key] of Object.entries(contentFields)) {
            const el = document.getElementById(formId);
            if (el && content[key]) {
                el.value = content[key];
            }
        }
    } catch (err) {
        console.error('Failed to load content:', err);
    }
}

// Save content to API
document.getElementById('contentForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();

    const token = sessionStorage.getItem('adminApiToken') || '';
    const body = {};

    for (const [formId, key] of Object.entries(contentFields)) {
        const el = document.getElementById(formId);
        if (el && el.value.trim()) {
            body[key] = el.value.trim();
        }
    }

    try {
        const res = await fetch('/api/content', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-token': token
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) throw new Error(`Failed to save content: ${res.status}`);

        const successMsg = document.getElementById('contentSaveSuccess');
        successMsg.style.display = 'block';
        setTimeout(() => { successMsg.style.display = 'none'; }, 3000);
        showNotification('Content saved successfully', 'success');
    } catch (err) {
        console.error(err);
        showNotification('Failed to save content', 'error');
    }
});

// Initialize on page load
if (checkAuth()) {
    updateDisplay();
    loadContent();
}
