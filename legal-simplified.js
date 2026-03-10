// ── Legal Simplified — one-question-at-a-time flow ──

var lsState = {
    selectedScenario: null,
    caseVolume:       null,
    budgetCommitment: null,
    responseTime:     null
};

var LS_STEPS = {
    1: { pct: '14%',  label: 'Situation',    cur: 1 },
    2: { pct: '28%',  label: 'Case Volume',  cur: 2 },
    3: { pct: '42%',  label: 'Ad Budget',    cur: 3 },
    4: { pct: '56%',  label: 'Response',     cur: 4 },
    5: { pct: '70%',  label: 'Your Name',    cur: 5 },
    6: { pct: '84%',  label: 'Contact',      cur: 6 },
    7: { pct: '100%', label: 'Book a Call',  cur: 7 }
};

var lsCurrentSlide = 1;

function lsShowSlide(n, direction) {
    var prev = document.getElementById('lsS' + lsCurrentSlide);
    var next = document.getElementById('lsS' + n);
    if (!next) return;

    if (prev) {
        prev.classList.remove('active', 'slide-back');
        prev.style.display = 'none';
    }

    next.style.display = 'block';
    next.classList.remove('active', 'slide-back');
    void next.offsetWidth;
    next.classList.add('active');
    if (direction === 'back') next.classList.add('slide-back');

    lsCurrentSlide = n;

    var step = LS_STEPS[n];
    if (step) {
        document.getElementById('lsProgressFill').style.width = step.pct;
        document.getElementById('lsStepLabel').textContent = step.label;
        document.getElementById('lsStepCur').textContent = step.cur;
    }
}

function lsNext(n) {
    lsShowSlide(n, 'forward');
    var card = document.querySelector('.ls-form-card');
    if (card && window.innerWidth < 900) {
        setTimeout(function () {
            card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
    }
}

function lsBack(n) {
    lsShowSlide(n, 'back');
}

// ── Scenario selection ────────────────────────────────────────────────────────

function lsSelectScenario(card) {
    document.querySelectorAll('#lsScenarios .ls-scenario').forEach(function (c) {
        c.classList.remove('sel');
    });
    card.classList.add('sel');
    lsState.selectedScenario = card.getAttribute('data-value');
    lsEnableBtn('lsN1');
}

// ── Option selection ──────────────────────────────────────────────────────────

function lsSelectOpt(card) {
    var q = card.getAttribute('data-q');
    document.querySelectorAll('[data-q="' + q + '"]').forEach(function (c) {
        c.classList.remove('sel', 'sel-disq');
    });

    var isDisq = card.getAttribute('data-disq') === 'true';
    card.classList.add(isDisq ? 'sel-disq' : 'sel');

    if (q === 'lsq1') lsState.caseVolume       = card.getAttribute('data-value');
    if (q === 'lsq2') lsState.budgetCommitment  = card.getAttribute('data-value');
    if (q === 'lsq3') lsState.responseTime      = card.getAttribute('data-value');

    if (q === 'lsq2') {
        var disqual = document.getElementById('lsBudgetDisqual');
        if (isDisq) {
            disqual.style.display = 'block';
            lsDisableBtn('lsN3');
        } else {
            disqual.style.display = 'none';
            lsEnableBtn('lsN3');
        }
        return;
    }

    var nextMap = { lsq1: 'lsN2', lsq3: 'lsN4' };
    if (nextMap[q]) lsEnableBtn(nextMap[q]);
}

// ── Name validation ───────────────────────────────────────────────────────────

function lsCheckName() {
    var name = document.getElementById('lsName').value.trim();
    if (name.length >= 2) lsEnableBtn('lsN5');
    else lsDisableBtn('lsN5');
}

// ── Contact validation ────────────────────────────────────────────────────────

function lsCheckContact() {
    var email = document.getElementById('lsEmail').value.trim();
    var phone = document.getElementById('lsPhone').value.trim();
    var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    var phoneOk = phone.replace(/\D/g, '').length === 10;
    if (emailOk && phoneOk) lsEnableBtn('lsN6');
    else lsDisableBtn('lsN6');
}

// ── Submit ────────────────────────────────────────────────────────────────────

function lsSubmitLead() {
    var name    = document.getElementById('lsName').value.trim();
    var email   = document.getElementById('lsEmail').value.trim();
    var phone   = document.getElementById('lsPhone').value.trim();
    var firm    = document.getElementById('lsFirm').value.trim();

    var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    var phoneOk = phone.replace(/\D/g, '').length === 10;
    if (!name || !emailOk || !phoneOk) { lsNotify('Please fill in all required fields.', 'error'); return; }

    var btn = document.getElementById('lsN6');
    btn.disabled = true;
    btn.textContent = 'Submitting…';

    if (typeof fbq === 'function') fbq('track', 'Lead');
    if (typeof window.lintrk === 'function') window.lintrk('track', { conversion_id: 26383314 });

    fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            source:           'legal-simplified',
            selectedScenario: lsState.selectedScenario,
            caseVolume:       lsState.caseVolume,
            budgetCommitment: lsState.budgetCommitment,
            responseTime:     lsState.responseTime,
            name:    name,
            email:   email,
            phone:   phone,
            firm:    firm || null
        })
    }).catch(function (err) { console.error('Lead POST failed:', err); });

    lsNext(7);
    lsLoadBooking();
}

// ── Booking widget ────────────────────────────────────────────────────────────

function lsLoadBooking() {
    var iframe = document.getElementById('lsBookingIframe');
    if (iframe && !iframe.src) {
        iframe.src = 'https://api.leadconnectorhq.com/widget/booking/swe1lSedf4hVYFTLSTIc';
        if (!document.getElementById('lsGhlEmbed')) {
            var s = document.createElement('script');
            s.id = 'lsGhlEmbed';
            s.src = 'https://link.msgsndr.com/js/form_embed.js';
            document.body.appendChild(s);
        }
    }
}

// ── Phone masking ─────────────────────────────────────────────────────────────

function lsInitPhone() {
    var input = document.getElementById('lsPhone');
    if (!input) return;
    input.addEventListener('input', function (e) {
        var v = e.target.value.replace(/\D/g, '').substring(0, 10);
        if (v.length >= 6)      v = '(' + v.slice(0,3) + ') ' + v.slice(3,6) + '-' + v.slice(6);
        else if (v.length >= 3) v = '(' + v.slice(0,3) + ') ' + v.slice(3);
        else if (v.length > 0)  v = '(' + v;
        e.target.value = v;
        lsCheckContact();
    });
}

// ── Keyboard nav (A/B/C/D keys) ──────────────────────────────────────────────

function lsInitKeyboard() {
    document.addEventListener('keydown', function (e) {
        var key = e.key.toUpperCase();
        var keyMap = { A: 0, B: 1, C: 2, D: 3 };
        if (!(key in keyMap)) return;

        var activeCards = null;
        if (lsCurrentSlide === 2) activeCards = document.querySelectorAll('#lsQ1 .ls-option');
        if (lsCurrentSlide === 3) activeCards = document.querySelectorAll('#lsQ2 .ls-option');
        if (lsCurrentSlide === 4) activeCards = document.querySelectorAll('#lsQ3 .ls-option');
        if (!activeCards) return;

        var idx = keyMap[key];
        if (activeCards[idx]) activeCards[idx].click();
    });
}

// ── Button helpers ────────────────────────────────────────────────────────────

function lsEnableBtn(id) {
    var btn = document.getElementById(id);
    if (btn) btn.disabled = false;
}

function lsDisableBtn(id) {
    var btn = document.getElementById(id);
    if (btn) btn.disabled = true;
}

// ── Notification ──────────────────────────────────────────────────────────────

function lsNotify(msg, type) {
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

// ── YouTube video ─────────────────────────────────────────────────────────────

var lsYtApiReady = false;
var lsYtPlayer = null;

window.onYouTubeIframeAPIReady = function () {
    lsYtApiReady = true;
    lsInitVideo();
};

function lsInitVideo() {
    if (lsYtPlayer) return;
    if (!lsYtApiReady || typeof YT === 'undefined' || !YT.Player) return;
    var container = document.getElementById('lsYtPlayer');
    if (!container) return;
    lsYtPlayer = new YT.Player('lsYtPlayer', {
        height: '100%',
        width: '100%',
        videoId: 'kvK3G0-ewdQ',
        playerVars: { rel: 0, modestbranding: 1 }
    });
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
    lsInitPhone();
    lsInitKeyboard();
    // Attempt video init if API already loaded
    if (typeof YT !== 'undefined' && YT.Player) {
        lsYtApiReady = true;
        lsInitVideo();
    }
});
