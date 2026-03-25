// ── General Contractors — Website Audit Funnel ──

var adSource = (function() {
    var p = new URLSearchParams(window.location.search);
    if (p.get('fbclid'))     return 'meta';
    if (p.get('li_fat_id'))  return 'linkedin';
    if (p.get('utm_source')) return p.get('utm_source');
    return document.referrer ? 'organic' : 'direct';
})();

var landingUrl = window.location.href;

var utmParams = (function() {
    var p = new URLSearchParams(window.location.search);
    var knownKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    var skipKeys  = ['fbclid', 'li_fat_id', 'gclid', 'msclkid'];
    var result = {};
    knownKeys.forEach(function(k) { if (p.get(k)) result[k] = p.get(k); });
    // Fallback: bare params (no value) from Meta/other platforms → store as utm_content
    if (!result.utm_content) {
        p.forEach(function(val, key) {
            if (val === '' && knownKeys.indexOf(key) === -1 && skipKeys.indexOf(key) === -1) {
                result.utm_content = key;
            }
        });
    }
    return result;
})();

var gcState = {
    name:        null,
    email:       null,
    phone:       null,
    revenueRange: null,
    website:     null,
    competitor:  null
};

var GC_STEPS = {
    1: { pct: '25%',  label: 'Your Info',    cur: 1 },
    2: { pct: '50%',  label: 'Revenue',      cur: 2 },
    3: { pct: '75%',  label: 'Your Website', cur: 3 },
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

    if (typeof window.gcTrackFormStep === 'function') window.gcTrackFormStep(n);
}

function gcNext(n) {
    var sid = sessionStorage.getItem('gcSid') || null;

    // Step 1 → 2: create lead record immediately
    if (gcCurrentSlide === 1 && n === 2) {
        gcState.name  = document.getElementById('gcName').value.trim();
        gcState.email = document.getElementById('gcEmail').value.trim();
        gcState.phone = document.getElementById('gcPhone').value.trim();
        fetch('/api/gc-lead', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id:  sid,
                name:        gcState.name,
                email:       gcState.email,
                phone:       gcState.phone,
                source:      adSource,
                utm_source:  utmParams.utm_source   || null,
                utm_medium:  utmParams.utm_medium   || null,
                utm_campaign:utmParams.utm_campaign || null,
                utm_content: utmParams.utm_content  || null,
                utm_term:    utmParams.utm_term     || null,
                landing_url: landingUrl             || null
            })
        }).catch(function(err) { console.error('gc-lead POST failed:', err); });
    }

    // Step 2 → 3: patch revenue + fire GHL webhook
    if (gcCurrentSlide === 2 && n === 3 && gcState.revenueRange) {
        fetch('/api/gc-lead', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sid, revenue_range: gcState.revenueRange })
        }).catch(function(){});

        var freshSid = sessionStorage.getItem('gcSid') || sid || '';
        var resumeUrl = window.location.origin + '/general-contractors?resume=' + freshSid + '#gcFormSection';
        console.log('[GC] Firing webhook with resume_url:', resumeUrl);
        fetch('https://services.leadconnectorhq.com/hooks/RZP0qqWcu4bX0Ca5wbMs/webhook-trigger/cb630048-c8fe-41d0-b5c4-e35f4193767c', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name:          gcState.name,
                email:         gcState.email,
                phone:         gcFormatPhone(gcState.phone),
                revenue_range: gcState.revenueRange,
                source:        adSource,
                resume_url:    resumeUrl
            })
        }).catch(function(){});
    }

    gcShowSlide(n, 'forward');
    setTimeout(function() {
        var card = document.querySelector('.gc-form-card');
        if (!card) return;
        card.scrollIntoView({ behavior: 'smooth', block: n === 4 ? 'start' : 'center' });
    }, 80);
}

function gcBack(n) {
    gcShowSlide(n, 'back');
}

// ── Phone normalization ───────────────────────────────────────────────────────

function gcFormatPhone(raw) {
    var digits = (raw || '').replace(/\D/g, '');
    if (digits.length === 11 && digits.charAt(0) === '1') digits = digits.slice(1);
    if (digits.length === 10) {
        return '(' + digits.slice(0, 3) + ') ' + digits.slice(3, 6) + '-' + digits.slice(6);
    }
    return raw; // fallback: send as-is if can't normalize
}

// ── Contact info validation ────────────────────────────────────────────────────

function gcValidateContact() {
    var name  = document.getElementById('gcName').value.trim();
    var email = document.getElementById('gcEmail').value.trim();
    var phone = document.getElementById('gcPhone').value.trim();
    var valid = name.length > 1 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && phone.replace(/\D/g,'').length >= 7;
    var btn = document.getElementById('gcN1');
    if (btn) btn.disabled = !valid;
    if (valid) {
        gcState.name  = name;
        gcState.email = email;
        gcState.phone = phone;
    }
}

// ── Revenue selection ─────────────────────────────────────────────────────────

function gcSelectRevenue(card) {
    document.querySelectorAll('#gcQ1 .gc-option').forEach(function(c) {
        c.classList.remove('sel', 'sel-disq');
    });

    var isDisq = card.getAttribute('data-disq') === 'true';
    card.classList.add(isDisq ? 'sel-disq' : 'sel');
    gcState.revenueRange = card.getAttribute('data-value');

    if (typeof window.gcTrackRevenue === 'function') window.gcTrackRevenue(gcState.revenueRange);

    if (isDisq) {
        var sid = sessionStorage.getItem('gcSid') || null;

        // Patch revenue to DB so the lead record is complete
        fetch('/api/gc-lead', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sid, revenue_range: gcState.revenueRange })
        }).catch(function(){});

        // Fire GHL webhook so unqualified leads enter the automation
        var freshSid = sid || '';
        var resumeUrl = window.location.origin + '/general-contractors?resume=' + freshSid + '#gcFormSection';
        fetch('https://services.leadconnectorhq.com/hooks/RZP0qqWcu4bX0Ca5wbMs/webhook-trigger/cb630048-c8fe-41d0-b5c4-e35f4193767c', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name:          gcState.name,
                email:         gcState.email,
                phone:         gcFormatPhone(gcState.phone),
                revenue_range: gcState.revenueRange,
                source:        adSource,
                resume_url:    resumeUrl
            })
        }).catch(function(){});

        setTimeout(function() {
            window.location.replace('/gc-uq');
        }, 600);
    } else {
        var disqual = document.getElementById('gcRevenueDisqual');
        if (disqual) disqual.style.display = 'none';
        gcEnableBtn('gcN2');
    }
}

// ── Website fields validation ──────────────────────────────────────────────────

function gcValidateWebsite() {
    var website    = document.getElementById('gcWebsite').value.trim();
    var competitor = document.getElementById('gcCompetitor').value.trim();
    var valid = website.length > 3 && competitor.length > 3;
    var btn = document.getElementById('gcN3');
    if (btn) btn.disabled = !valid;
    if (valid) {
        gcState.website    = website;
        gcState.competitor = competitor;
    }
}

// ── Submit (step 3 → 4): patch website + competitor ───────────────────────────

function gcSubmitLead() {
    var btn = document.getElementById('gcN3');
    btn.disabled = true;
    btn.textContent = 'Submitting…';

    if (typeof fbq === 'function') fbq('track', 'Lead');
    if (typeof window.lintrk === 'function') window.lintrk('track', { conversion_id: 26383314 });

    gcState.website    = document.getElementById('gcWebsite').value.trim();
    gcState.competitor = document.getElementById('gcCompetitor').value.trim();

    var sid = sessionStorage.getItem('gcSid') || null;

    fetch('/api/gc-lead', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            session_id: sid,
            website:    gcState.website,
            competitor: gcState.competitor
        })
    }).catch(function(err) { console.error('gc-lead PATCH failed:', err); });

    if (typeof window.gcTrackFormComplete === 'function') window.gcTrackFormComplete();

    gcNext(4);
    gcLoadBooking();
}

// ── Booking widget ────────────────────────────────────────────────────────────

var gcBookingListenerAdded = false;

function gcLoadBooking() {
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
                var sid = sessionStorage.getItem('gcSid') || null;
                if (sid) {
                    fetch('/api/gc-lead', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ session_id: sid, booked_call: true }),
                        keepalive: true
                    }).catch(function(){});
                }
                sessionStorage.setItem('gcBooked', '1');
                window.location.href = '/thank-you-gc';
            }
        });
    }
}

// ── Keyboard nav (A/B/C/D on revenue slide only) ──────────────────────────────

function gcInitKeyboard() {
    document.addEventListener('keydown', function(e) {
        if (gcCurrentSlide !== 2) return;
        var key = e.key.toUpperCase();
        var keyMap = { A: 0, B: 1, C: 2, D: 3 };
        if (!(key in keyMap)) return;
        var activeCards = document.querySelectorAll('#gcQ1 .gc-option');
        if (activeCards[keyMap[key]]) activeCards[keyMap[key]].click();
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
});
