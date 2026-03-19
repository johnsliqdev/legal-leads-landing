// ── General Contractors — Website Audit Funnel ──

var adSource = (function() {
    var p = new URLSearchParams(window.location.search);
    if (p.get('fbclid'))     return 'meta';
    if (p.get('li_fat_id'))  return 'linkedin';
    if (p.get('utm_source')) return p.get('utm_source');
    return document.referrer ? 'organic' : 'direct';
})();

var gcState = {
    website:      null,
    competitors:  null,
    revenueRange: null,
    situation:    null
};

var GC_STEPS = {
    1: { pct: '25%',  label: 'Your Website', cur: 1 },
    2: { pct: '50%',  label: 'Revenue',      cur: 2 },
    3: { pct: '75%',  label: 'Challenge',    cur: 3 },
    4: { pct: '100%', label: 'Reserve Spot', cur: 4 }
};

var gcCurrentSlide = 1;

function gcShowSlide(n, direction) {
    var prev = document.getElementById('gcS' + gcCurrentSlide);
    var next = document.getElementById('gcS' + n);
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

    gcCurrentSlide = n;

    var step = GC_STEPS[n];
    if (step) {
        document.getElementById('gcProgressFill').style.width = step.pct;
        document.getElementById('gcStepLabel').textContent   = step.label;
        document.getElementById('gcStepCur').textContent     = step.cur;
    }
}

function gcNext(n) {
    gcShowSlide(n, 'forward');
    var card = document.querySelector('.gc-form-card');
    if (card && window.innerWidth < 900) {
        setTimeout(function() {
            card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
    }
}

function gcBack(n) {
    gcShowSlide(n, 'back');
}

// ── Step 1: Validation ────────────────────────────────────────────────────────

function gcValidateDomain(val) {
    var cleaned = val.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '');
    return /^[a-zA-Z0-9]([a-zA-Z0-9\-]*\.)+[a-zA-Z]{2,10}(\/.*)?$/.test(cleaned);
}

function gcCheckInfo() {
    var website    = document.getElementById('gcWebsite').value.trim();
    var websiteOk  = gcValidateDomain(website);
    var websiteErr = document.getElementById('gcWebsiteErr');

    if (website.length > 0 && !websiteOk) {
        websiteErr.style.display = 'block';
    } else {
        websiteErr.style.display = 'none';
    }

    if (websiteOk) {
        gcEnableBtn('gcN1');
    } else {
        gcDisableBtn('gcN1');
    }
}

function gcSubmitInfo() {
    gcState.website     = document.getElementById('gcWebsite').value.trim();
    gcState.competitors = document.getElementById('gcCompetitors').value.trim();
    gcNext(2);
}

// ── Revenue selection ─────────────────────────────────────────────────────────

function gcSelectRevenue(card) {
    document.querySelectorAll('#gcQ1 .gc-option').forEach(function(c) {
        c.classList.remove('sel', 'sel-disq');
    });

    var isDisq = card.getAttribute('data-disq') === 'true';
    card.classList.add(isDisq ? 'sel-disq' : 'sel');
    gcState.revenueRange = card.getAttribute('data-value');

    var disqual = document.getElementById('gcRevenueDisqual');
    if (isDisq) {
        disqual.style.display = 'block';
        gcDisableBtn('gcN2');
    } else {
        disqual.style.display = 'none';
        gcEnableBtn('gcN2');
    }
}

// ── Situation selection ───────────────────────────────────────────────────────

function gcSelectSituation(card) {
    document.querySelectorAll('#gcScenarios .gc-scenario').forEach(function(c) {
        c.classList.remove('sel');
    });
    card.classList.add('sel');
    gcState.situation = card.getAttribute('data-value');
    gcEnableBtn('gcN3');
}

// ── Submit & advance to booking ───────────────────────────────────────────────

function gcSubmitLead() {
    var btn = document.getElementById('gcN3');
    btn.disabled = true;
    btn.textContent = 'Submitting…';

    if (typeof fbq === 'function') fbq('track', 'Lead');
    if (typeof window.lintrk === 'function') window.lintrk('track', { conversion_id: 26383314 });

    fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            source:        'general-contractors',
            funnel:        'GC Audit Funnel',
            ad_source:     adSource,
            website:       gcState.website,
            competitors:   gcState.competitors,
            revenue_range: gcState.revenueRange,
            situation:     gcState.situation
        })
    }).catch(function(err) { console.error('Lead POST failed:', err); });

    gcNext(4);
    gcLoadBooking();
}

// ── Booking widget ────────────────────────────────────────────────────────────

var gcBookingListenerAdded = false;

function gcLoadBooking() {
    // Widen the form card for the booking widget
    var wrap = document.getElementById('gcFormWrap');
    if (wrap) wrap.classList.add('gc-form-wrap-booking');

    var iframe = document.getElementById('gcBookingIframe');
    if (iframe && !iframe.src) {
        iframe.src = 'https://api.leadconnectorhq.com/widget/booking/bHLOuWOsVymv9VQHPXfc';
        if (!document.getElementById('gcGhlEmbed')) {
            var s = document.createElement('script');
            s.id  = 'gcGhlEmbed';
            s.src = 'https://link.msgsndr.com/js/form_embed.js';
            document.body.appendChild(s);
        }
    }

    if (!gcBookingListenerAdded) {
        gcBookingListenerAdded = true;
        window.addEventListener('message', function(e) {
            if (Array.isArray(e.data) && e.data[0] === 'msgsndr-booking-complete') {
                window.location.href = '/thank-you-gc';
            }
        });
    }
}

function gcShowThankYou() {
    window.location.href = '/thank-you-gc';
}

// ── Phone masking ─────────────────────────────────────────────────────────────

// ── Keyboard nav (A/B/C/D) ────────────────────────────────────────────────────

function gcInitKeyboard() {
    document.addEventListener('keydown', function(e) {
        var key = e.key.toUpperCase();
        var keyMap = { A: 0, B: 1, C: 2, D: 3 };
        if (!(key in keyMap)) return;

        var activeCards = null;
        if (gcCurrentSlide === 2) activeCards = document.querySelectorAll('#gcQ1 .gc-option');
        if (gcCurrentSlide === 3) activeCards = document.querySelectorAll('#gcScenarios .gc-scenario');
        if (!activeCards) return;

        var idx = keyMap[key];
        if (activeCards[idx]) activeCards[idx].click();
    });
}

// ── Button helpers ────────────────────────────────────────────────────────────

function gcEnableBtn(id) {
    var btn = document.getElementById(id);
    if (btn) btn.disabled = false;
}

function gcDisableBtn(id) {
    var btn = document.getElementById(id);
    if (btn) btn.disabled = true;
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
    gcInitKeyboard();
    var websiteEl = document.getElementById('gcWebsite');
    if (websiteEl) websiteEl.addEventListener('input', gcCheckInfo);
});
