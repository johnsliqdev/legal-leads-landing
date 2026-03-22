// Admin dashboard functionality
let cpqlTarget = 700;
let activeCampaign = 'pi'; // 'pi' | 'ls' | 'gc'

// ─── Sidebar panel navigation ─────────────────────────────────────────────────

document.querySelectorAll('.nav-item[data-panel]').forEach(function(btn) {
    btn.addEventListener('click', function() {
        var panelId = this.getAttribute('data-panel');
        // Update nav active state
        document.querySelectorAll('.nav-item[data-panel]').forEach(function(b) { b.classList.remove('active'); });
        this.classList.add('active');
        // Show panel
        document.querySelectorAll('.panel').forEach(function(p) { p.classList.remove('active'); });
        var panel = document.getElementById('panel-' + panelId);
        if (panel) panel.classList.add('active');
        // Close sidebar on mobile
        closeSidebar();
    });
});

// ─── Mobile sidebar ───────────────────────────────────────────────────────────

var sidebar = document.getElementById('sidebar');
var sidebarOverlay = document.getElementById('sidebarOverlay');

document.getElementById('sidebarToggle')?.addEventListener('click', function() {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('open');
});

sidebarOverlay?.addEventListener('click', closeSidebar);

function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('open');
}

// ─── Campaign switcher ────────────────────────────────────────────────────────

function switchCampaign(campaign) {
    activeCampaign = campaign;
    ['PI', 'LS', 'GC'].forEach(function(id) {
        var btn = document.getElementById('tab' + id);
        if (btn) btn.classList.remove('active');
    });
    var activeTab = campaign === 'pi' ? 'tabPI' : campaign === 'ls' ? 'tabLS' : 'tabGC';
    var el = document.getElementById(activeTab);
    if (el) el.classList.add('active');
    displaySubmissions();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

function checkAuth() {
    if (sessionStorage.getItem('adminLoggedIn') !== 'true') {
        window.location.href = 'admin.html';
        return false;
    }
    return true;
}

// ─── CPQL target ─────────────────────────────────────────────────────────────

async function loadCpqlTarget() {
    const res = await fetch('/api/settings', { method: 'GET' });
    if (!res.ok) throw new Error(`Failed to load CPQL target: ${res.status}`);
    const data = await res.json();
    const value = Number(data?.cpqlTarget);
    if (Number.isFinite(value)) cpqlTarget = value;
    return cpqlTarget;
}

async function saveCpqlTarget(value) {
    const token = sessionStorage.getItem('adminApiToken') || '';
    const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ cpqlTarget: value })
    });
    if (!res.ok) throw new Error(`Failed to save CPQL target: ${res.status}`);
    const data = await res.json();
    const next = Number(data?.cpqlTarget);
    cpqlTarget = Number.isFinite(next) ? next : value;
    return cpqlTarget;
}

// ─── GC Seats ─────────────────────────────────────────────────────────────────

async function loadGcSeats() {
    const res = await fetch('/api/settings', { method: 'GET' });
    if (!res.ok) return 2;
    const data = await res.json();
    return Number.isFinite(Number(data?.gcSeats)) ? Number(data.gcSeats) : 2;
}

async function saveGcSeats(seats) {
    const token = sessionStorage.getItem('adminApiToken') || '';
    const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ cpqlTarget: cpqlTarget, gcSeats: seats })
    });
    if (!res.ok) throw new Error('Failed to save seats');
    return seats;
}

document.getElementById('gcSeatsForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const val = parseInt(document.getElementById('gcSeatsInput').value, 10);
    if (Number.isFinite(val) && val >= 0) {
        try {
            await saveGcSeats(val);
            showFlash('gcSeatsSaveSuccess');
        } catch (err) {
            showNotification('Failed to save seats', 'error');
        }
    }
});

// ─── GC Analytics ─────────────────────────────────────────────────────────────

async function loadGcAnalytics() {
    const token = sessionStorage.getItem('adminApiToken') || '';
    try {
        const res = await fetch('/api/gc-lead?type=session', {
            headers: { 'x-admin-token': token }
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.analytics;
    } catch (err) {
        return null;
    }
}

function renderGcAnalytics(a) {
    const el = document.getElementById('gcAnalyticsPanel');
    if (!el || !a) return;
    const total = Number(a.total_sessions) || 0;
    const pct = function(n) { return total ? Math.round((Number(n) / total) * 100) : 0; };
    const avgTime = Number(a.avg_time_on_page) || 0;
    const mins = Math.floor(avgTime / 60);
    const secs = avgTime % 60;

    const booked = Number(a.booked_calls) || 0;
    el.innerHTML =
        '<div class="analytics-grid">' +
            metricCard('Total Visits', total) +
            metricCard('Reached Form', pct(a.reached_form) + '%') +
            metricCard('Started Form', pct(a.started_form) + '%') +
            metricCard('Completed Form', pct(a.completed_form) + '%') +
            metricCard('Booked a Call', booked + ' (' + pct(a.booked_calls) + '%)') +
            metricCard('Avg. Time on Page', mins + 'm ' + secs + 's') +
        '</div>' +
        '<div style="margin-top:16px;">' +
            '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--muted);margin-bottom:10px;">Form Drop-off by Step</div>' +
            '<div class="analytics-grid">' +
                metricCard('Dropped Step 1', Number(a.dropped_step1) || 0) +
                metricCard('Dropped Step 2', Number(a.dropped_step2) || 0) +
                metricCard('Dropped Step 3', Number(a.dropped_step3) || 0) +
                metricCard('Dropped Step 4', Number(a.dropped_step4) || 0) +
            '</div>' +
        '</div>';
}

function metricCard(label, value) {
    return '<div class="metric-card"><div class="metric-value">' + value + '</div><div class="metric-label">' + label + '</div></div>';
}

// ─── Submissions ──────────────────────────────────────────────────────────────

async function loadSubmissions() {
    const token = sessionStorage.getItem('adminApiToken') || '';
    const url = activeCampaign === 'gc'
        ? '/api/gc-lead'
        : activeCampaign === 'ls' ? '/api/leads?funnel=ls' : '/api/leads?funnel=cpql';
    const res = await fetch(url, { method: 'GET', headers: { 'x-admin-token': token } });
    if (!res.ok) throw new Error(`Failed to load submissions: ${res.status}`);
    const raw = await res.json();
    // gc-lead returns { leads: [...] }; other endpoints return arrays directly
    return activeCampaign === 'gc' ? (raw.leads || []) : raw;
}

async function displaySubmissions() {
    const list = document.getElementById('submissionsList');
    let submissions = [];
    try {
        submissions = await loadSubmissions();
    } catch (err) {
        console.error(err);
        list.innerHTML = '<div class="no-submissions">Unable to load submissions.</div>';
        renderMetrics([]);
        return;
    }
    renderMetrics(submissions);
    if (activeCampaign === 'gc') {
        loadGcAnalytics().then(renderGcAnalytics).catch(function(err) { console.error(err); });
    }
    if (submissions.length === 0) {
        list.innerHTML = '<div class="no-submissions">No submissions yet.</div>';
        return;
    }
    list.innerHTML = submissions.map(function(s) {
        return activeCampaign === 'gc' ? renderGcSubmission(s)
             : activeCampaign === 'ls' ? renderLsSubmission(s)
             : renderPiSubmission(s);
    }).join('');
}

function renderMetrics(submissions) {
    const el = document.getElementById('campaignMetrics');
    if (!el) return;
    const card = function(label, value) {
        return `<div class="metric-card"><div class="metric-value">${value}</div><div class="metric-label">${label}</div></div>`;
    };
    if (activeCampaign === 'gc') {
        const total = submissions.length;
        const pending = submissions.filter(function(s) { return s.audit_status === 'pending'; }).length;
        const complete = submissions.filter(function(s) { return s.audit_status === 'complete'; }).length;
        el.innerHTML = card('Total Opt-ins', total) + card('Pending Audit', pending) + card('Audit Complete', complete);
    } else if (activeCampaign === 'ls') {
        const total = submissions.length;
        const qualified = submissions.filter(function(s) { return s.meta_budget_commitment && s.meta_budget_commitment !== 'Under $10,000/mo'; }).length;
        const withScenario = submissions.filter(function(s) { return s.situation; }).length;
        el.innerHTML = card('Total Leads', total) + card('Qualified', qualified) + card('Completed Questionnaire', withScenario);
    } else {
        const total = submissions.length;
        const withCalc = submissions.filter(function(s) { return s.calc_current_cpql; }).length;
        const callbacks = submissions.filter(function(s) { return s.requested_callback; }).length;
        el.innerHTML = card('Total Leads', total) + card('Ran Calculator', withCalc) + card('Callback Requests', callbacks);
    }
}

function renderPiSubmission(s) {
    const v = function(x) { return x || '—'; };
    const money = function(x) { return x ? '$' + Number(x).toLocaleString() : '—'; };
    const pct = function(x) { return x ? x + '%' : '—'; };
    const dur = function(sec) { if (!sec) return '—'; var m = Math.floor(sec/60), s = sec%60; return m > 0 ? m+'m '+s+'s' : s+'s'; };
    const yn = function(x) { if (!x) return '—'; return x === 'yes' ? 'Yes' : x === 'no' ? 'No' : x; };
    const bud = function(x) { if (!x) return '—'; return x === '10k' ? '$10,000/mo' : x === '5k' ? '$5,000/mo' : x; };
    return `<div class="submission-item">
        <div class="submission-header">
            <div class="submission-date">${new Date(s.created_at).toLocaleString()}</div>
            <div class="submission-id">ID: ${s.id}${s.requested_callback ? ' · <span style="color:#00e676;font-weight:600;">CALLBACK</span>' : ''}</div>
        </div>
        <div class="submission-details">
            <div class="sub-section">Contact</div>
            <div class="sub-field"><div class="sub-label">Email</div><div class="sub-value">${v(s.email)}</div></div>
            <div class="sub-field"><div class="sub-label">Phone</div><div class="sub-value">${v(s.phone)}</div></div>
            <div class="sub-field"><div class="sub-label">Website</div><div class="sub-value">${v(s.website)}</div></div>
            <div class="sub-section">Calculator</div>
            <div class="sub-field"><div class="sub-label">Monthly Spend</div><div class="sub-value">${money(s.calc_current_monthly_spend)}</div></div>
            <div class="sub-field"><div class="sub-label">Current CPQL</div><div class="sub-value">${money(s.calc_current_cpql)}</div></div>
            <div class="sub-field"><div class="sub-label">Monthly Leads</div><div class="sub-value">${v(s.calc_leads_count)}</div></div>
            <div class="sub-field"><div class="sub-label">CPQL Reduction</div><div class="sub-value">${pct(s.calc_cpql_reduction)}</div></div>
            <div class="sub-section">Qualification</div>
            <div class="sub-field"><div class="sub-label">Meta Budget</div><div class="sub-value">${bud(s.meta_budget_commitment)}</div></div>
            <div class="sub-field"><div class="sub-label">Dedicated Intake</div><div class="sub-value">${yn(s.dedicated_intake)}</div></div>
            <div class="sub-field"><div class="sub-label">Uses CRM</div><div class="sub-value">${yn(s.uses_crm)}</div></div>
            <div class="sub-field"><div class="sub-label">Differentiator</div><div class="sub-value">${v(s.firm_differentiator)}</div></div>
            <div class="sub-section">Video Engagement</div>
            <div class="sub-field"><div class="sub-label">Watch Duration</div><div class="sub-value">${dur(s.video_watch_seconds)}</div></div>
            <div class="sub-field"><div class="sub-label">Completion</div><div class="sub-value">${s.video_watch_percent ? s.video_watch_percent + '%' : '—'}</div></div>
        </div>
    </div>`;
}

function renderLsSubmission(s) {
    const v = function(x) { return x || '—'; };
    const yn = function(x) { if (!x) return '—'; return x === 'yes' ? 'Yes' : x === 'no' ? 'No' : x; };
    return `<div class="submission-item">
        <div class="submission-header">
            <div class="submission-date">${new Date(s.created_at).toLocaleString()}</div>
            <div class="submission-id">ID: ${s.id} · Simple Legal</div>
        </div>
        <div class="submission-details">
            <div class="sub-section">Contact</div>
            <div class="sub-field"><div class="sub-label">Email</div><div class="sub-value">${v(s.email)}</div></div>
            <div class="sub-field"><div class="sub-label">Phone</div><div class="sub-value">${v(s.phone)}</div></div>
            <div class="sub-field"><div class="sub-label">Website</div><div class="sub-value">${v(s.website)}</div></div>
            <div class="sub-section">Questionnaire</div>
            <div class="sub-field"><div class="sub-label">Situation</div><div class="sub-value">${v(s.situation)}</div></div>
            <div class="sub-field"><div class="sub-label">Budget Commitment</div><div class="sub-value">${v(s.meta_budget_commitment)}</div></div>
            <div class="sub-field"><div class="sub-label">Has CRM</div><div class="sub-value">${yn(s.uses_crm)}</div></div>
            <div class="sub-field"><div class="sub-label">Dedicated Intake</div><div class="sub-value">${yn(s.dedicated_intake)}</div></div>
            <div class="sub-field"><div class="sub-label">Ad Source</div><div class="sub-value">${v(s.ad_source)}</div></div>
        </div>
    </div>`;
}

function renderGcSubmission(s) {
    const v = function(x) { return x || '—'; };
    const statusColor = s.audit_status === 'complete' ? '#00c864' : '#ff006e';
    const date = s.created_at ? new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
    return `<div class="submission-card">
        <div class="sub-row"><span class="sub-label">Name</span><span class="sub-val">${v(s.name)}</span></div>
        <div class="sub-row"><span class="sub-label">Email</span><span class="sub-val">${v(s.email)}</span></div>
        <div class="sub-row"><span class="sub-label">Phone</span><span class="sub-val">${v(s.phone)}</span></div>
        <div class="sub-row"><span class="sub-label">Revenue</span><span class="sub-val">${v(s.revenue_range)}</span></div>
        <div class="sub-row"><span class="sub-label">Website</span><span class="sub-val">${v(s.website)}</span></div>
        <div class="sub-row"><span class="sub-label">Competitor</span><span class="sub-val">${v(s.competitor)}</span></div>
        <div class="sub-row"><span class="sub-label">Source</span><span class="sub-val">${v(s.source)}</span></div>
        ${s.utm_campaign ? `<div class="sub-row"><span class="sub-label">Campaign</span><span class="sub-val">${s.utm_campaign}</span></div>` : ''}
        ${s.utm_medium   ? `<div class="sub-row"><span class="sub-label">Medium</span><span class="sub-val">${s.utm_medium}</span></div>`   : ''}
        ${s.utm_content  ? `<div class="sub-row"><span class="sub-label">Creative</span><span class="sub-val">${s.utm_content}</span></div>` : ''}
        ${s.utm_term     ? `<div class="sub-row"><span class="sub-label">Term</span><span class="sub-val">${s.utm_term}</span></div>`         : ''}
        <div class="sub-row"><span class="sub-label">Booked Call</span><span class="sub-val" style="color:${s.booked_call ? '#00c864' : 'var(--muted)'};font-weight:700;">${s.booked_call ? '✓ Yes' : 'Not yet'}</span></div>
        <div class="sub-row"><span class="sub-label">Status</span><span class="sub-val" style="color:${statusColor};font-weight:700;">${v(s.audit_status)}</span></div>
        <div class="sub-row"><span class="sub-label">Date</span><span class="sub-val">${date}</span></div>
    </div>`;
}

// ─── Refresh / Clear ──────────────────────────────────────────────────────────

document.getElementById('refreshSubmissions')?.addEventListener('click', async function() {
    await displaySubmissions();
    showNotification('Submissions refreshed', 'success');
});

document.getElementById('clearSubmissions')?.addEventListener('click', async function() {
    if (!confirm('Delete all submissions for this funnel? This cannot be undone.')) return;
    try {
        const token = sessionStorage.getItem('adminApiToken') || '';
        const deleteUrl = activeCampaign === 'gc' ? '/api/gc-lead'
                        : activeCampaign === 'ls' ? '/api/leads?funnel=ls' : '/api/leads?funnel=cpql';
        const res = await fetch(deleteUrl, { method: 'DELETE', headers: { 'x-admin-token': token } });
        if (!res.ok) throw new Error('Failed');
        await displaySubmissions();
        showNotification('Submissions cleared', 'success');
    } catch (err) {
        console.error(err);
        showNotification('Failed to clear submissions', 'error');
    }
});

// ─── CPQL form ────────────────────────────────────────────────────────────────

document.getElementById('cpqlForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const val = parseFloat(document.getElementById('cpqlTarget').value);
    if (val >= 0) {
        try {
            await saveCpqlTarget(val);
            document.getElementById('cpqlTarget').value = val;
            showFlash('updateSuccess');
        } catch (err) {
            showNotification('Failed to update CPQL target', 'error');
        }
    }
});

// ─── Content management ───────────────────────────────────────────────────────

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

async function loadContent() {
    try {
        const res = await fetch('/api/content', { method: 'GET' });
        if (!res.ok) return;
        const content = await res.json();
        for (const [formId, key] of Object.entries(contentFields)) {
            const el = document.getElementById(formId);
            if (el && content[key]) el.value = content[key];
        }
        // LS fields
        if (content.ls_heroTitle) document.getElementById('lsHeroTitle').value = content.ls_heroTitle;
        if (content.ls_heroSubtitle) document.getElementById('lsHeroSubtitle').value = content.ls_heroSubtitle;
        if (content.ls_ctaText) document.getElementById('lsCtaText').value = content.ls_ctaText;
        // GC fields
        if (content.gc_heroTitle) document.getElementById('gcHeroTitle').value = content.gc_heroTitle;
        if (content.gc_heroSubtitle) document.getElementById('gcHeroSubtitle').value = content.gc_heroSubtitle;
        if (content.gc_ctaText) document.getElementById('gcCtaText').value = content.gc_ctaText;
        if (content.gc_scarcityNote) document.getElementById('gcScarcityNote').value = content.gc_scarcityNote;
    } catch (err) {
        console.error('Failed to load content:', err);
    }
}

document.getElementById('contentForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const token = sessionStorage.getItem('adminApiToken') || '';
    const body = {};
    for (const [formId, key] of Object.entries(contentFields)) {
        const el = document.getElementById(formId);
        if (el && el.value.trim()) body[key] = el.value.trim();
    }
    try {
        const res = await fetch('/api/content', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error('Failed');
        showFlash('contentSaveSuccess');
        showNotification('Content saved', 'success');
    } catch (err) {
        showNotification('Failed to save content', 'error');
    }
});

document.getElementById('lsContentForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const token = sessionStorage.getItem('adminApiToken') || '';
    const body = {
        ls_heroTitle: document.getElementById('lsHeroTitle').value.trim(),
        ls_heroSubtitle: document.getElementById('lsHeroSubtitle').value.trim(),
        ls_ctaText: document.getElementById('lsCtaText').value.trim()
    };
    try {
        const res = await fetch('/api/content', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error('Failed');
        showFlash('lsSaveSuccess');
        showNotification('Saved', 'success');
    } catch (err) {
        showNotification('Failed to save', 'error');
    }
});

document.getElementById('gcContentForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const token = sessionStorage.getItem('adminApiToken') || '';
    const body = {
        gc_heroTitle: document.getElementById('gcHeroTitle').value.trim(),
        gc_heroSubtitle: document.getElementById('gcHeroSubtitle').value.trim(),
        gc_ctaText: document.getElementById('gcCtaText').value.trim(),
        gc_scarcityNote: document.getElementById('gcScarcityNote').value.trim()
    };
    try {
        const res = await fetch('/api/content', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error('Failed');
        showFlash('gcSaveSuccess');
        showNotification('Saved', 'success');
    } catch (err) {
        showNotification('Failed to save', 'error');
    }
});

// ─── Password ─────────────────────────────────────────────────────────────────

const pwModal = document.getElementById('changePasswordModal');

document.getElementById('changePasswordBtn')?.addEventListener('click', function() {
    pwModal.style.display = 'flex';
});
document.getElementById('closePasswordModal')?.addEventListener('click', function() {
    pwModal.style.display = 'none';
});
window.addEventListener('click', function(e) {
    if (e.target === pwModal) pwModal.style.display = 'none';
});

document.getElementById('changePasswordForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const cur = document.getElementById('currentPassword').value;
    const next = document.getElementById('newPassword').value;
    const conf = document.getElementById('confirmPassword').value;
    if (next !== conf) { showNotification('Passwords do not match', 'error'); return; }
    if (next.length < 6) { showNotification('Password must be at least 6 characters', 'error'); return; }
    const token = sessionStorage.getItem('adminApiToken') || '';
    try {
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
            body: JSON.stringify({ action: 'changePassword', currentPassword: cur, newPassword: next })
        });
        if (!res.ok) {
            const data = await res.json();
            showNotification(data.error === 'current_password_incorrect' ? 'Current password incorrect' : 'Failed to change password', 'error');
            return;
        }
        sessionStorage.setItem('adminApiToken', next);
        this.reset();
        pwModal.style.display = 'none';
        showNotification('Password changed', 'success');
    } catch (err) {
        showNotification('Failed to change password', 'error');
    }
});

// ─── Logout ───────────────────────────────────────────────────────────────────

document.getElementById('logoutBtn')?.addEventListener('click', function() {
    sessionStorage.removeItem('adminLoggedIn');
    sessionStorage.removeItem('adminApiToken');
    window.location.href = 'admin.html';
});

// ─── Notifications ────────────────────────────────────────────────────────────

function showFlash(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = 'block';
    setTimeout(function() { el.style.display = 'none'; }, 3000);
}

function showNotification(message, type) {
    const n = document.createElement('div');
    n.textContent = message;
    n.style.cssText = `position:fixed;top:20px;right:20px;padding:13px 18px;border-radius:9px;color:#fff;font-weight:600;font-size:13.5px;z-index:1000;transform:translateX(120%);transition:transform 0.28s;max-width:280px;font-family:Inter,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,0.4);`;
    n.style.background = type === 'success' ? 'linear-gradient(135deg,#00e676,#00c853)' : 'linear-gradient(135deg,#ff006e,#ff4081)';
    document.body.appendChild(n);
    setTimeout(function() { n.style.transform = 'translateX(0)'; }, 50);
    setTimeout(function() { n.style.transform = 'translateX(120%)'; setTimeout(function() { document.body.removeChild(n); }, 300); }, 3000);
}

// ─── Init ─────────────────────────────────────────────────────────────────────

async function updateDisplay() {
    try {
        const target = await loadCpqlTarget();
        const el = document.getElementById('cpqlTarget');
        if (el) el.value = target;
    } catch (err) {
        console.error(err);
    }
    try {
        const seats = await loadGcSeats();
        const seatsEl = document.getElementById('gcSeatsInput');
        if (seatsEl) seatsEl.value = seats;
    } catch (err) {
        console.error(err);
    }
    await displaySubmissions();
    try {
        if (activeCampaign === 'gc') {
            const analytics = await loadGcAnalytics();
            renderGcAnalytics(analytics);
        }
    } catch (err) {
        console.error(err);
    }
}

if (checkAuth()) {
    updateDisplay();
    loadContent();
}
