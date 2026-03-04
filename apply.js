document.addEventListener('DOMContentLoaded', function () {

    // --- Phone masking ---
    var phoneInput = document.getElementById('phone');
    if (phoneInput) {
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

    // --- Step 1: Qualifier form ---
    var budgetRadios = document.querySelectorAll('input[name="budget"]');
    var disqualMessage = document.getElementById('disqualMessage');
    var qualifierSubmitBtn = document.getElementById('qualifierSubmitBtn');

    budgetRadios.forEach(function (radio) {
        radio.addEventListener('change', function () {
            if (this.value === 'no') {
                disqualMessage.style.display = 'block';
                qualifierSubmitBtn.disabled = true;
                qualifierSubmitBtn.style.opacity = '0.5';
                qualifierSubmitBtn.style.cursor = 'not-allowed';
            } else {
                disqualMessage.style.display = 'none';
                qualifierSubmitBtn.disabled = false;
                qualifierSubmitBtn.style.opacity = '1';
                qualifierSubmitBtn.style.cursor = 'pointer';
            }
        });
    });

    var qualifierForm = document.getElementById('qualifierForm');
    if (qualifierForm) {
        qualifierForm.addEventListener('submit', function (e) {
            e.preventDefault();

            var zip = document.getElementById('zipCode').value.trim();
            var budget = document.querySelector('input[name="budget"]:checked');

            if (!zip) {
                showNotification('Please enter your zip code.', 'error');
                return;
            }
            if (!budget || budget.value !== 'yes') {
                return;
            }

            // Store zip for later
            window.applyZip = zip;

            // Show step 2
            var contactSection = document.getElementById('contactSection');
            contactSection.style.display = 'block';
            contactSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }

    // --- Step 2: Contact form ---
    var contactForm = document.getElementById('contactForm');
    if (contactForm) {
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

            // Disable form
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
                    website: window.applyZip || '',
                    firstName: firstName,
                    lastName: lastName
                })
            })
                .then(function (res) { return res.json(); })
                .catch(function (err) { console.error('Lead POST failed:', err); });

            // Show booking
            var bookingSection = document.getElementById('bookingSection');
            bookingSection.style.display = 'block';
            loadBookingWidget();
            bookingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    // --- Booking widget loader ---
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

    // --- Notification helper ---
    function showNotification(message, type) {
        var notification = document.createElement('div');
        notification.style.cssText = [
            'position:fixed', 'top:20px', 'right:20px', 'padding:15px 20px',
            'border-radius:5px', 'color:white', 'font-weight:bold', 'z-index:1000',
            'transform:translateX(100%)', 'transition:transform 0.3s ease',
            'max-width:300px', 'box-shadow:0 10px 25px rgba(0,0,0,0.3)'
        ].join(';');
        notification.style.backgroundColor = type === 'error' ? '#dc3545' : '#28a745';
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(function () { notification.style.transform = 'translateX(0)'; }, 100);
        setTimeout(function () {
            notification.style.transform = 'translateX(100%)';
            setTimeout(function () { document.body.removeChild(notification); }, 300);
        }, 3000);
    }
});
