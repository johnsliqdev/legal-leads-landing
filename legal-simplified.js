// ── Legal Simplified — one-question-at-a-time flow ──

var adSource = (function() {
    var p = new URLSearchParams(window.location.search);
    if (p.get('fbclid'))    return 'meta';
    if (p.get('li_fat_id')) return 'linkedin';
    if (p.get('utm_source')) return p.get('utm_source');
    return document.referrer ? 'organic' : 'direct';
})();

var lsState = {
    name:             null,
    email:            null,
    phone:            null,
    website:          null,
    selectedScenario: null,
    budgetCommitment: null,
    hasCRM:           null,
    hasIntake:        null
};

var LS_STEPS = {
    1: { pct: '17%',  label: 'Your Info',    cur: 1 },
    2: { pct: '33%',  label: 'Situation',    cur: 2 },
    3: { pct: '50%',  label: 'Ad Budget',    cur: 3 },
    4: { pct: '67%',  label: 'CRM',          cur: 4 },
    5: { pct: '83%',  label: 'Intake',       cur: 5 },
    6: { pct: '100%', label: 'Book a Call',  cur: 6 }
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

// ── Step 1: Basic info validation ────────────────────────────────────────────

function lsValidateDomain(val) {
    var cleaned = val.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '');
    // Must contain at least one dot with a valid TLD (2–10 chars)
    return /^[a-zA-Z0-9]([a-zA-Z0-9\-]*\.)+[a-zA-Z]{2,10}(\/.*)?$/.test(cleaned);
}

function lsCheckInfo() {
    var name    = document.getElementById('lsName').value.trim();
    var email   = document.getElementById('lsEmail').value.trim();
    var phone   = document.getElementById('lsPhone').value.trim();
    var website = document.getElementById('lsWebsite').value.trim();

    var emailOk   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    var phoneOk   = phone.replace(/\D/g, '').length === 10;
    var websiteOk = lsValidateDomain(website);
    var nameOk    = name.length >= 2;

    var websiteErr = document.getElementById('lsWebsiteErr');
    if (website.length > 0 && !websiteOk) {
        websiteErr.style.display = 'block';
    } else {
        websiteErr.style.display = 'none';
    }

    if (nameOk && emailOk && phoneOk && websiteOk) {
        lsEnableBtn('lsN1');
    } else {
        lsDisableBtn('lsN1');
    }
}

function lsSubmitInfo() {
    var name    = document.getElementById('lsName').value.trim();
    var email   = document.getElementById('lsEmail').value.trim();
    var phone   = document.getElementById('lsPhone').value.trim();
    var website = document.getElementById('lsWebsite').value.trim();

    lsState.name    = name;
    lsState.email   = email;
    lsState.phone   = phone;
    lsState.website = website;

    lsNext(2);
}

// ── Scenario selection ────────────────────────────────────────────────────────

function lsSelectScenario(card) {
    document.querySelectorAll('#lsScenarios .ls-scenario').forEach(function (c) {
        c.classList.remove('sel');
    });
    card.classList.add('sel');
    lsState.selectedScenario = card.getAttribute('data-value');
    lsEnableBtn('lsN2');
}

// ── Option selection ──────────────────────────────────────────────────────────

function lsSelectOpt(card) {
    var q = card.getAttribute('data-q');
    document.querySelectorAll('[data-q="' + q + '"]').forEach(function (c) {
        c.classList.remove('sel', 'sel-disq');
    });

    var isDisq = card.getAttribute('data-disq') === 'true';
    card.classList.add(isDisq ? 'sel-disq' : 'sel');

    if (q === 'lsq2') lsState.budgetCommitment = card.getAttribute('data-value');
    if (q === 'lsq3') lsState.hasCRM           = card.getAttribute('data-value');
    if (q === 'lsq4') lsState.hasIntake        = card.getAttribute('data-value');

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

    var nextMap = { lsq3: 'lsN4', lsq4: 'lsN5' };
    if (nextMap[q]) lsEnableBtn(nextMap[q]);
}

// ── Submit & advance to booking ───────────────────────────────────────────────

function lsSubmitLead() {
    var btn = document.getElementById('lsN5');
    btn.disabled = true;
    btn.textContent = 'Submitting…';

    if (typeof fbq === 'function') fbq('track', 'Lead');
    if (typeof window.lintrk === 'function') window.lintrk('track', { conversion_id: 26383314 });

    fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            source:           'legal-simplified',
            funnel:           'Simple Legal Funnel',
            ad_source:        adSource,
            name:             lsState.name,
            email:            lsState.email,
            phone:            lsState.phone,
            website:          lsState.website,
            selectedScenario: lsState.selectedScenario,
            budgetCommitment: lsState.budgetCommitment,
            hasCRM:           lsState.hasCRM,
            hasIntake:        lsState.hasIntake
        })
    }).catch(function (err) { console.error('Lead POST failed:', err); });

    lsNext(6);
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
    // Reveal the post-booking section (case study + video)
    var postSection = document.getElementById('lsPostBooking');
    if (postSection) {
        postSection.style.display = 'block';
        // Init video now that the container is visible
        lsInitVideo();
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
        lsCheckInfo();
    });
}

// ── Keyboard nav (A/B/C/D keys) ──────────────────────────────────────────────

function lsInitKeyboard() {
    document.addEventListener('keydown', function (e) {
        var key = e.key.toUpperCase();
        var keyMap = { A: 0, B: 1, C: 2, D: 3 };
        if (!(key in keyMap)) return;

        var activeCards = null;
        if (lsCurrentSlide === 3) activeCards = document.querySelectorAll('#lsQ2 .ls-option');
        if (lsCurrentSlide === 4) activeCards = document.querySelectorAll('#lsQ3 .ls-option');
        if (lsCurrentSlide === 5) activeCards = document.querySelectorAll('#lsQ4 .ls-option');
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
};

function lsInitVideo() {
    if (lsYtPlayer) return;
    if (!lsYtApiReady && !(typeof YT !== 'undefined' && YT.Player)) return;
    lsYtApiReady = true;
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
    // Wire all info-field inputs to validation
    ['lsName','lsEmail','lsWebsite'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('input', lsCheckInfo);
    });
});
