var selectedBudget = null;
var applyZip = '';

// --- Option card selection ---
function selectBudget(card) {
    var cards = document.querySelectorAll('#budgetOptions .option-card');
    cards.forEach(function (c) {
        c.classList.remove('selected', 'selected-no');
    });

    selectedBudget = card.getAttribute('data-value');

    if (selectedBudget === 'yes') {
        card.classList.add('selected');
        document.getElementById('disqualMessage').style.display = 'none';
        updateStep1Btn();
    } else {
        card.classList.add('selected-no');
        document.getElementById('disqualMessage').style.display = 'block';
        disableStep1Btn();
    }
}

function updateStep1Btn() {
    var zip = document.getElementById('zipCode').value.trim();
    var btn = document.getElementById('step1Btn');
    if (zip && selectedBudget === 'yes') {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
    } else {
        disableStep1Btn();
    }
}

function disableStep1Btn() {
    var btn = document.getElementById('step1Btn');
    btn.disabled = true;
    btn.style.opacity = '0.45';
    btn.style.cursor = 'not-allowed';
}

function submitStep1() {
    var zip = document.getElementById('zipCode').value.trim();
    if (!zip) {
        showNotification('Please enter your zip code.', 'error');
        return;
    }
    if (selectedBudget !== 'yes') return;

    applyZip = zip;

    // Progress: step 1 done, step 2 active
    setStep(2);

    var step2 = document.getElementById('step2');
    step2.style.display = 'block';
    setTimeout(function () {
        step2.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
}

// --- Step progress indicator ---
function setStep(n) {
    for (var i = 1; i <= 3; i++) {
        var dot = document.getElementById('dot' + i);
        dot.classList.remove('active', 'done');
        if (i < n) dot.classList.add('done');
        else if (i === n) dot.classList.add('active');
    }
    for (var j = 1; j <= 2; j++) {
        var line = document.getElementById('line' + j);
        line.classList.toggle('done', j < n);
    }
}

// --- Phone masking ---
function initPhoneMask() {
    var phoneInput = document.getElementById('phone');
    if (!phoneInput) return;
    phoneInput.addEventListener('input', function (e) {
        var val = e.target.value.replace(/\D/g, '').substring(0, 10);
        if (val.length >= 6) {
            val = '(' + val.substring(0, 3) + ') ' + val.substring(3, 6) + '-' + val.substring(6);
        } else if (val.length >= 3) {
            val = '(' + val.substring(0, 3) + ') ' + val.substring(3);
        } else if (val.length > 0) {
            val = '(' + val;
        }
        e.target.value = val;
    });
}

// --- Contact form submission ---
function initContactForm() {
    var contactForm = document.getElementById('contactForm');
    if (!contactForm) return;

    contactForm.addEventListener('submit', function (e) {
        e.preventDefault();

        var firstName = document.getElementById('firstName').value.trim();
        var lastName = document.getElementById('lastName').value.trim();
        var email = document.getElementById('email').value.trim();
        var phone = document.getElementById('phone').value.trim();

        var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        var phoneDigits = phone.replace(/\D/g, '');

        if (!firstName || !lastName) {
            showNotification('Please enter your full name.', 'error');
            return;
        }
        if (!email || !emailRegex.test(email)) {
            showNotification('Please enter a valid email address.', 'error');
            return;
        }
        if (phoneDigits.length !== 10) {
            showNotification('Please enter a valid 10-digit US phone number.', 'error');
            return;
        }

        // Lock form
        var submitBtn = contactForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitted ✓';
        submitBtn.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';

        // Meta Pixel: Lead event
        if (typeof fbq === 'function') fbq('track', 'Lead');

        // POST to /api/leads
        fetch('/api/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                phone: phone,
                website: applyZip,
                firstName: firstName,
                lastName: lastName
            })
        }).catch(function (err) { console.error('Lead POST failed:', err); });

        // Progress: step 2 done, step 3 active
        setStep(3);

        var step3 = document.getElementById('step3');
        step3.style.display = 'block';
        loadBookingWidget();
        setTimeout(function () {
            step3.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
    });
}

// --- Booking widget ---
function loadBookingWidget() {
    var iframe = document.getElementById('bookingIframe');
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

// --- Notification ---
function showNotification(message, type) {
    var notification = document.createElement('div');
    notification.style.cssText = [
        'position:fixed', 'top:20px', 'right:20px', 'padding:15px 20px',
        'border-radius:8px', 'color:white', 'font-weight:bold', 'z-index:9999',
        'transform:translateX(110%)', 'transition:transform 0.3s ease',
        'max-width:300px', 'box-shadow:0 10px 25px rgba(0,0,0,0.3)',
        'font-family:Inter,sans-serif'
    ].join(';');
    notification.style.backgroundColor = type === 'error' ? '#dc3545' : '#28a745';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(function () { notification.style.transform = 'translateX(0)'; }, 50);
    setTimeout(function () {
        notification.style.transform = 'translateX(110%)';
        setTimeout(function () { if (notification.parentNode) document.body.removeChild(notification); }, 300);
    }, 3500);
}

// --- Init ---
document.addEventListener('DOMContentLoaded', function () {
    // Zip input enables/disables button
    document.getElementById('zipCode').addEventListener('input', updateStep1Btn);
    initPhoneMask();
    initContactForm();
});
