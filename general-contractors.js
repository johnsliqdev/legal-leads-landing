// ── General Contractors — Jotform-style one-question-at-a-time flow ──

var gcState = {
    selectedScenario: null,
    avgProjectValue:  null,
    budgetCommitment: null,
    responseTime:     null
};

// Progress: each slide maps to a % fill and a label
var GC_STEPS = {
    1: { pct: '14%',  label: 'Scenario',      cur: 1 },
    2: { pct: '28%',  label: 'Project Value',  cur: 2 },
    3: { pct: '42%',  label: 'Budget',         cur: 3 },
    4: { pct: '56%',  label: 'Response Time',  cur: 4 },
    5: { pct: '70%',  label: 'Your Name',      cur: 5 },
    6: { pct: '84%',  label: 'Contact',        cur: 6 },
    7: { pct: '100%', label: 'Book a Call',    cur: 7 }
};

var currentSlide = 1;

function gcShowSlide(n, direction) {
    var prev = document.getElementById('gcS' + currentSlide);
    var next = document.getElementById('gcS' + n);
    if (!next) return;

    if (prev) {
        prev.classList.remove('active', 'slide-back');
        prev.style.display = 'none';
    }

    next.style.display = 'block';
    next.classList.remove('active', 'slide-back');
    // Force reflow
    void next.offsetWidth;
    next.classList.add('active');
    if (direction === 'back') next.classList.add('slide-back');

    currentSlide = n;

    var step = GC_STEPS[n];
    if (step) {
        document.getElementById('gcProgressFill').style.width = step.pct;
        document.getElementById('gcStepLabel').textContent = step.label;
        document.getElementById('gcStepCur').textContent = step.cur;
    }
}

function gcNext(n) {
    gcShowSlide(n, 'forward');
    // Scroll to top of card on mobile
    var card = document.querySelector('.gc-form-card');
    if (card && window.innerWidth < 900) {
        setTimeout(function () {
            card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
    }
}

function gcBack(n) {
    gcShowSlide(n, 'back');
}

// ── Scenario selection ────────────────────────────────────────────────────────

function gcSelectScenario(card) {
    document.querySelectorAll('#gcScenarios .gc-scenario').forEach(function (c) {
        c.classList.remove('sel');
    });
    card.classList.add('sel');
    gcState.selectedScenario = card.getAttribute('data-value');
    gcEnableBtn('gcN1');
}

// ── Option selection (qualifier Qs) ──────────────────────────────────────────

function gcSelectOpt(card) {
    var q = card.getAttribute('data-q');
    document.querySelectorAll('[data-q="' + q + '"]').forEach(function (c) {
        c.classList.remove('sel', 'sel-disq');
    });

    var isDisq = card.getAttribute('data-disq') === 'true';
    card.classList.add(isDisq ? 'sel-disq' : 'sel');

    if (q === 'q1') gcState.avgProjectValue  = card.getAttribute('data-value');
    if (q === 'q2') gcState.budgetCommitment = card.getAttribute('data-value');
    if (q === 'q3') gcState.responseTime     = card.getAttribute('data-value');

    // Budget disqualification
    if (q === 'q2') {
        var disqual = document.getElementById('gcBudgetDisqual');
        if (isDisq) {
            disqual.style.display = 'block';
            gcDisableBtn('gcN3');
        } else {
            disqual.style.display = 'none';
            gcEnableBtn('gcN3');
        }
        return;
    }

    // Enable next for non-budget questions
    var nextMap = { q1: 'gcN2', q3: 'gcN4' };
    if (nextMap[q]) gcEnableBtn(nextMap[q]);
}

// ── Name validation ───────────────────────────────────────────────────────────

function gcCheckName() {
    var name = document.getElementById('gcName').value.trim();
    if (name.length >= 2) gcEnableBtn('gcN5');
    else gcDisableBtn('gcN5');
}

// ── Contact validation ────────────────────────────────────────────────────────

function gcCheckContact() {
    var email = document.getElementById('gcEmail').value.trim();
    var phone = document.getElementById('gcPhone').value.trim();
    var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    var phoneOk = phone.replace(/\D/g, '').length === 10;
    if (emailOk && phoneOk) gcEnableBtn('gcN6');
    else gcDisableBtn('gcN6');
}

// ── Submit ────────────────────────────────────────────────────────────────────

function gcSubmitLead() {
    var name    = document.getElementById('gcName').value.trim();
    var email   = document.getElementById('gcEmail').value.trim();
    var phone   = document.getElementById('gcPhone').value.trim();
    var website = document.getElementById('gcWebsite').value.trim();

    var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    var phoneOk = phone.replace(/\D/g, '').length === 10;
    if (!name || !emailOk || !phoneOk) { gcNotify('Please fill in all required fields.', 'error'); return; }

    // Lock button
    var btn = document.getElementById('gcN6');
    btn.disabled = true;
    btn.textContent = 'Submitting…';

    // Meta Pixel
    if (typeof fbq === 'function') fbq('track', 'Lead');

    // POST to DB
    fetch('/api/contractor-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            selectedScenario: gcState.selectedScenario,
            avgProjectValue:  gcState.avgProjectValue,
            budgetCommitment: gcState.budgetCommitment,
            responseTime:     gcState.responseTime,
            name:    name,
            email:   email,
            phone:   phone,
            website: website || null
        })
    }).catch(function (err) { console.error('Lead POST failed:', err); });

    // Advance to booking
    gcNext(7);
    loadGcBooking();
}

// ── Booking widget ────────────────────────────────────────────────────────────

function loadGcBooking() {
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

// ── Phone masking ─────────────────────────────────────────────────────────────

function gcInitPhone() {
    var input = document.getElementById('gcPhone');
    if (!input) return;
    input.addEventListener('input', function (e) {
        var v = e.target.value.replace(/\D/g, '').substring(0, 10);
        if (v.length >= 6)      v = '(' + v.slice(0,3) + ') ' + v.slice(3,6) + '-' + v.slice(6);
        else if (v.length >= 3) v = '(' + v.slice(0,3) + ') ' + v.slice(3);
        else if (v.length > 0)  v = '(' + v;
        e.target.value = v;
        gcCheckContact();
    });
}

// ── Keyboard nav (A/B/C/D keys) ──────────────────────────────────────────────

function gcInitKeyboard() {
    document.addEventListener('keydown', function (e) {
        var key = e.key.toUpperCase();
        var keyMap = { A: 0, B: 1, C: 2, D: 3 };
        if (!(key in keyMap)) return;

        // Only for slides 2–4 (qualifier questions)
        var activeCards = null;
        if (currentSlide === 2) activeCards = document.querySelectorAll('#gcQ1 .gc-option');
        if (currentSlide === 3) activeCards = document.querySelectorAll('#gcQ2 .gc-option');
        if (currentSlide === 4) activeCards = document.querySelectorAll('#gcQ3 .gc-option');
        if (!activeCards) return;

        var idx = keyMap[key];
        if (activeCards[idx]) activeCards[idx].click();
    });
}

// ── Button helpers ────────────────────────────────────────────────────────────

function gcEnableBtn(id) {
    var btn = document.getElementById(id);
    if (!btn) return;
    btn.disabled = false;
}

function gcDisableBtn(id) {
    var btn = document.getElementById(id);
    if (!btn) return;
    btn.disabled = true;
}

// ── Notification ──────────────────────────────────────────────────────────────

function gcNotify(msg, type) {
    var n = document.createElement('div');
    n.style.cssText = 'position:fixed;top:20px;right:20px;padding:14px 20px;border-radius:8px;color:#fff;font-weight:700;z-index:9999;transform:translateX(110%);transition:transform 0.3s;max-width:300px;box-shadow:0 10px 25px rgba(0,0,0,0.3);font-family:Inter,sans-serif;font-size:14px;';
    n.style.backgroundColor = type === 'error' ? '#dc3545' : '#28a745';
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(function () { n.style.transform = 'translateX(0)'; }, 50);
    setTimeout(function () {
        n.style.transform = 'translateX(110%)';
        setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 300);
    }, 3500);
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
    gcInitPhone();
    gcInitKeyboard();
});
