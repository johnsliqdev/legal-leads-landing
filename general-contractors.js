// ── General Contractors campaign funnel ──

var gcState = {
    selectedScenario: null,
    avgProjectValue: null,
    budgetCommitment: null,
    responseTime: null
};

// ─── Step progress ────────────────────────────────────────────────────────────

function gcSetStep(n) {
    for (var i = 1; i <= 4; i++) {
        var dot = document.getElementById('gcDot' + i);
        if (!dot) continue;
        dot.classList.remove('active', 'done');
        if (i < n) dot.classList.add('done');
        else if (i === n) dot.classList.add('active');
    }
    for (var j = 1; j <= 3; j++) {
        var line = document.getElementById('gcLine' + j);
        if (line) line.classList.toggle('done', j < n);
    }
}

function scrollToSection(id) {
    var el = document.getElementById(id);
    if (!el) return;
    setTimeout(function () {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
}

// ─── Step 1: Scenario selection ───────────────────────────────────────────────

function selectScenario(card) {
    document.querySelectorAll('#scenarioCards .scenario-card').forEach(function (c) {
        c.classList.remove('selected');
    });
    card.classList.add('selected');
    gcState.selectedScenario = card.getAttribute('data-value');
    enableBtn('step1Btn');
}

function advanceToStep2() {
    if (!gcState.selectedScenario) return;
    gcSetStep(2);
    document.getElementById('gcStep2').style.display = 'block';
    scrollToSection('gcStep2');
}

// ─── Step 2: Qualifier options ────────────────────────────────────────────────

function selectOption(card) {
    var q = card.getAttribute('data-q');
    document.querySelectorAll('[data-q="' + q + '"]').forEach(function (c) {
        c.classList.remove('selected', 'selected-disq');
    });

    var isDisq = card.getAttribute('data-disq') === 'true';
    card.classList.add(isDisq ? 'selected-disq' : 'selected');

    if (q === 'q1') gcState.avgProjectValue = card.getAttribute('data-value');
    if (q === 'q2') {
        gcState.budgetCommitment = card.getAttribute('data-value');
        var box = document.getElementById('budgetDisqual');
        box.style.display = isDisq ? 'block' : 'none';
    }
    if (q === 'q3') gcState.responseTime = card.getAttribute('data-value');

    checkStep2Complete();
}

function checkStep2Complete() {
    var budgetIsDisq = gcState.budgetCommitment === 'No, outside budget';
    var allAnswered = gcState.avgProjectValue && gcState.budgetCommitment && gcState.responseTime;

    if (allAnswered && !budgetIsDisq) {
        enableBtn('step2Btn');
    } else {
        disableBtn('step2Btn');
    }
}

function advanceToStep3() {
    if (!gcState.avgProjectValue || !gcState.budgetCommitment || !gcState.responseTime) return;
    gcSetStep(3);
    document.getElementById('gcStep3').style.display = 'block';
    scrollToSection('gcStep3');
}

// ─── Step 3: Contact form ─────────────────────────────────────────────────────

function initContactForm() {
    var form = document.getElementById('gcContactForm');
    if (!form) return;

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        var name    = document.getElementById('gcName').value.trim();
        var phone   = document.getElementById('gcPhone').value.trim();
        var email   = document.getElementById('gcEmail').value.trim();
        var website = document.getElementById('gcWebsite').value.trim();

        var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        var phoneOk = phone.replace(/\D/g, '').length === 10;

        if (!name) { gcNotify('Please enter your name.', 'error'); return; }
        if (!emailOk) { gcNotify('Please enter a valid email address.', 'error'); return; }
        if (!phoneOk) { gcNotify('Please enter a valid 10-digit US phone number.', 'error'); return; }

        // Lock form
        var btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Submitted ✓';
        btn.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';

        // Meta Pixel
        if (typeof fbq === 'function') fbq('track', 'Lead');

        // POST to DB
        fetch('/api/contractor-leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                selectedScenario:  gcState.selectedScenario,
                avgProjectValue:   gcState.avgProjectValue,
                budgetCommitment:  gcState.budgetCommitment,
                responseTime:      gcState.responseTime,
                name:    name,
                email:   email,
                phone:   phone,
                website: website || null
            })
        }).catch(function (err) { console.error('Contractor lead POST failed:', err); });

        // Advance to booking
        gcSetStep(4);
        document.getElementById('gcStep4').style.display = 'block';
        loadBookingWidget();
        scrollToSection('gcStep4');
    });
}

// ─── Booking widget ───────────────────────────────────────────────────────────

function loadBookingWidget() {
    var iframe = document.getElementById('gcBookingIframe');
    if (iframe && !iframe.src) {
        iframe.src = 'https://api.leadconnectorhq.com/widget/booking/swe1lSedf4hVYFTLSTIc';
        if (!document.getElementById('ghlFormEmbed')) {
            var s = document.createElement('script');
            s.id = 'ghlFormEmbed';
            s.src = 'https://link.msgsndr.com/js/form_embed.js';
            document.body.appendChild(s);
        }
    }
}

// ─── Phone masking ────────────────────────────────────────────────────────────

function initPhoneMask() {
    var input = document.getElementById('gcPhone');
    if (!input) return;
    input.addEventListener('input', function (e) {
        var v = e.target.value.replace(/\D/g, '').substring(0, 10);
        if (v.length >= 6)      v = '(' + v.slice(0,3) + ') ' + v.slice(3,6) + '-' + v.slice(6);
        else if (v.length >= 3) v = '(' + v.slice(0,3) + ') ' + v.slice(3);
        else if (v.length > 0)  v = '(' + v;
        e.target.value = v;
    });
}

// ─── Button helpers ───────────────────────────────────────────────────────────

function enableBtn(id) {
    var btn = document.getElementById(id);
    if (!btn) return;
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
}

function disableBtn(id) {
    var btn = document.getElementById(id);
    if (!btn) return;
    btn.disabled = true;
    btn.style.opacity = '0.45';
    btn.style.cursor = 'not-allowed';
}

// ─── Notification ─────────────────────────────────────────────────────────────

function gcNotify(message, type) {
    var n = document.createElement('div');
    n.style.cssText = [
        'position:fixed','top:20px','right:20px','padding:15px 20px',
        'border-radius:8px','color:white','font-weight:bold','z-index:9999',
        'transform:translateX(110%)','transition:transform 0.3s ease',
        'max-width:300px','box-shadow:0 10px 25px rgba(0,0,0,0.3)',
        'font-family:Inter,sans-serif'
    ].join(';');
    n.style.backgroundColor = type === 'error' ? '#dc3545' : '#28a745';
    n.textContent = message;
    document.body.appendChild(n);
    setTimeout(function () { n.style.transform = 'translateX(0)'; }, 50);
    setTimeout(function () {
        n.style.transform = 'translateX(110%)';
        setTimeout(function () { if (n.parentNode) document.body.removeChild(n); }, 300);
    }, 3500);
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
    initPhoneMask();
    initContactForm();
});
