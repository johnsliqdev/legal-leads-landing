// Main script for legal leads landing page

let lastCalculation = null;
let cpqlTarget = 700;
let contactFormData = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded');

    loadCpqlTarget()
        .catch((err) => console.error('Failed to load CPQL target', err))
        .finally(() => {
            // Initialize CPQL calculator
            initializeCPLCalculator();

            // Initialize contact form
            initializeContactForm();

            // Initialize callback button
            initializeCallbackButton();
        });
});

async function loadCpqlTarget() {
    try {
        const res = await fetch('/api/settings', { method: 'GET' });
        if (!res.ok) throw new Error(`settings GET failed: ${res.status}`);
        const data = await res.json();
        if (Number.isFinite(Number(data?.cpqlTarget))) {
            cpqlTarget = Number(data.cpqlTarget);
        }
    } catch (err) {
        console.error(err);
    }

    applyCpqlTargetToUi(cpqlTarget);
}

function applyCpqlTargetToUi(target) {
    const formatted = `$${Math.round(target).toLocaleString()}`;

    const targetCpl = document.getElementById('targetCpl');
    if (targetCpl) targetCpl.textContent = formatted;
}

function initializeCPLCalculator() {
    const form = document.getElementById('cplForm');

    if (!form) {
        console.log('Calculator form not found');
        return;
    }

    // Legend card highlight on input focus
    ['adSpend', 'marketingFees', 'leadsCount'].forEach(fieldId => {
        const input = document.getElementById(fieldId);
        const card = document.getElementById(`legend-${fieldId}`);
        if (!input || !card) return;

        input.addEventListener('focus', () => card.classList.add('is-active'));
        input.addEventListener('blur', () => card.classList.remove('is-active'));
    });

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log('Calculator form submitted');
        
        // Get form values
        const adSpend = parseFloat(document.getElementById('adSpend').value) || 0;
        const marketingFees = parseFloat(document.getElementById('marketingFees').value) || 0;
        const leadsCount = parseFloat(document.getElementById('leadsCount').value) || 0;
        
        console.log('Form values:', { adSpend, marketingFees, leadsCount });
        
        // Calculate current CPL
        const totalMonthlySpend = adSpend + marketingFees;
        const currentCpl = leadsCount > 0 ? totalMonthlySpend / leadsCount : 0;
        
        console.log('Calculated current CPL:', currentCpl);
        
        // Calculate savings with guaranteed CPL
        const guaranteedCpl = Number.isFinite(cpqlTarget) ? cpqlTarget : 700;
        const newMonthlySpend = guaranteedCpl * leadsCount;
        const monthlySavings = totalMonthlySpend - newMonthlySpend;
        const annualSavings = monthlySavings * 12;
        const sameBudgetLeads = guaranteedCpl > 0 ? totalMonthlySpend / guaranteedCpl : 0;

        console.log('Calculated savings:', { monthlySavings, annualSavings, sameBudgetLeads });

        const percentageSavings = currentCpl > 0
            ? ((currentCpl - guaranteedCpl) / currentCpl) * 100
            : 0;

        lastCalculation = {
            currentCpl,
            guaranteedCpl,
            leadsCount,
            totalMonthlySpend,
            newMonthlySpend,
            monthlySavings,
            annualSavings,
            percentageSavings,
            sameBudgetLeads
        };
        
        updateResultsSection({
            currentCpl,
            guaranteedCpl,
            leadsCount,
            totalMonthlySpend,
            newMonthlySpend,
            monthlySavings,
            annualSavings,
            percentageSavings,
            sameBudgetLeads
        });

        populateHiddenCalculationFields(lastCalculation);

        // Combine contact form data with calculator data and submit to database
        if (contactFormData) {
            const completeFormData = {
                firstName: contactFormData.firstName,
                lastName: contactFormData.lastName,
                email: contactFormData.email,
                phone: contactFormData.phone,
                lawFirm: contactFormData.lawFirm,
                website: contactFormData.website || '',
                calcCurrentMonthlySpend: String(Math.round(totalMonthlySpend)),
                calcCurrentCpql: String(Math.round(currentCpl)),
                calcGuaranteedCpql: String(Math.round(guaranteedCpl)),
                calcNewMonthlySpend: String(Math.round(newMonthlySpend)),
                calcMonthlySavings: String(Math.round(monthlySavings)),
                calcAnnualSavings: String(Math.round(annualSavings)),
                calcCpqlReduction: (Number.isFinite(percentageSavings) ? percentageSavings : 0).toFixed(1),
                calcLeadsCount: String(Math.round(leadsCount)),
                calcSameBudgetLeads: String(Math.round(sameBudgetLeads))
            };

            console.log('Submitting complete form data:', completeFormData);
            submitToDatabase(completeFormData);
        }

        const resultsSection = document.getElementById('results');
        if (resultsSection) {
            resultsSection.style.display = 'block';
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
}

function updateResultsSection(data) {
    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    const setValueClass = (id, kind) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.remove('is-positive', 'is-negative');
        if (kind) el.classList.add(kind);
    };

    // Always-visible metrics
    setText('resultCurrentMonthlySpend', `$${Math.round(data.totalMonthlySpend).toLocaleString()}`);
    setText('resultCurrentCpql', `$${Math.round(data.currentCpl).toLocaleString()}`);
    setText('resultLeadsCount', `${Math.round(data.leadsCount).toLocaleString()}`);

    // Savings metrics (shown in savings view)
    setText('resultNewMonthlySpend', `$${Math.round(data.newMonthlySpend).toLocaleString()}`);
    setText('resultMonthlySavings', `$${Math.round(data.monthlySavings).toLocaleString()}`);
    setText('resultAnnualSavings', `$${Math.round(data.annualSavings).toLocaleString()}`);
    setText('resultCpqlReduction', `${(Number.isFinite(data.percentageSavings) ? data.percentageSavings : 0).toFixed(1)}%`);
    setText('resultSameBudgetLeads', `${Math.round(data.sameBudgetLeads).toLocaleString()}`);

    setValueClass('resultMonthlySavings', data.monthlySavings >= 0 ? 'is-positive' : 'is-negative');
    setValueClass('resultAnnualSavings', data.annualSavings >= 0 ? 'is-positive' : 'is-negative');
    setValueClass('resultCpqlReduction', data.percentageSavings >= 0 ? 'is-positive' : 'is-negative');
    setValueClass('resultSameBudgetLeads', 'is-positive');

    // Toggle views based on whether they're outperforming our target
    const isOutstanding = data.currentCpl > 0 && data.currentCpl <= data.guaranteedCpl;

    const savingsView = document.getElementById('resultsSavingsView');
    const outstandingView = document.getElementById('resultsOutstandingView');
    const callbackCtaHeading = document.getElementById('callbackCtaHeading');
    const callbackCtaText = document.getElementById('callbackCtaText');
    const callbackBtn = document.getElementById('requestCallbackBtn');

    if (isOutstanding) {
        if (savingsView) savingsView.style.display = 'none';
        if (outstandingView) outstandingView.style.display = 'block';
        setText('outstandingCurrentCpql', `$${Math.round(data.currentCpl).toLocaleString()}`);
        if (callbackCtaHeading) callbackCtaHeading.textContent = 'Interested in going even further?';
        if (callbackCtaText) callbackCtaText.textContent = "Your CPQL is already exceptional. Let's talk about scaling your results without sacrificing quality.";
        if (callbackBtn) callbackBtn.textContent = 'Discuss My Growth Strategy';
    } else {
        if (savingsView) savingsView.style.display = 'block';
        if (outstandingView) outstandingView.style.display = 'none';
        if (callbackCtaHeading) callbackCtaHeading.textContent = 'Want to discuss these savings?';
        if (callbackCtaText) callbackCtaText.textContent = "Let's talk about how we can achieve these results for your firm";
        if (callbackBtn) callbackBtn.textContent = 'Request a Callback';
    }
}

function populateHiddenCalculationFields(calc) {
    if (!calc) return;

    const setHidden = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value;
    };

    setHidden('calcCurrentMonthlySpend', String(Math.round(calc.totalMonthlySpend)));
    setHidden('calcCurrentCpql', String(Math.round(calc.currentCpl)));
    setHidden('calcGuaranteedCpql', String(Math.round(calc.guaranteedCpl)));
    setHidden('calcNewMonthlySpend', String(Math.round(calc.newMonthlySpend)));
    setHidden('calcMonthlySavings', String(Math.round(calc.monthlySavings)));
    setHidden('calcAnnualSavings', String(Math.round(calc.annualSavings)));
    setHidden('calcCpqlReduction', (Number.isFinite(calc.percentageSavings) ? calc.percentageSavings : 0).toFixed(1));
    setHidden('calcLeadsCount', String(Math.round(calc.leadsCount)));
    setHidden('calcSameBudgetLeads', String(Math.round(calc.sameBudgetLeads)));
}

function initializeContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    // US phone masking: (XXX) XXX-XXXX
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            let val = e.target.value.replace(/\D/g, '').substring(0, 10);
            if (val.length >= 6) {
                val = `(${val.substring(0,3)}) ${val.substring(3,6)}-${val.substring(6)}`;
            } else if (val.length >= 3) {
                val = `(${val.substring(0,3)}) ${val.substring(3)}`;
            } else if (val.length > 0) {
                val = `(${val}`;
            }
            e.target.value = val;
        });
    }

    // Step navigation
    const goToStep = (step) => {
        [1, 2, 3].forEach(n => {
            const el = document.getElementById(`formStep${n}`);
            if (el) el.style.display = n === step ? 'block' : 'none';

            const stepItem = document.querySelector(`.step-item[data-step="${n}"]`);
            if (stepItem) {
                stepItem.classList.remove('active', 'done');
                if (n < step) stepItem.classList.add('done');
                if (n === step) stepItem.classList.add('active');
            }
        });

        // Update step lines
        document.querySelectorAll('.step-line').forEach((line, i) => {
            line.classList.toggle('done', step > i + 1);
        });
    };

    // Step 1 → 2
    document.getElementById('step1Next')?.addEventListener('click', () => {
        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        if (!firstName || !lastName) {
            showNotification('Please enter your first and last name.', 'error');
            return;
        }
        goToStep(2);
        document.getElementById('email')?.focus();
    });

    // Step 2 → 1
    document.getElementById('step2Back')?.addEventListener('click', () => goToStep(1));

    // Step 2 → 3
    document.getElementById('step2Next')?.addEventListener('click', () => {
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneDigits = phone.replace(/\D/g, '');

        if (!email || !emailRegex.test(email)) {
            showNotification('Please enter a valid email address.', 'error');
            return;
        }
        if (phoneDigits.length !== 10) {
            showNotification('Please enter a valid 10-digit US phone number.', 'error');
            return;
        }
        goToStep(3);
        document.getElementById('lawFirm')?.focus();
    });

    // Step 3 → 2
    document.getElementById('step3Back')?.addEventListener('click', () => goToStep(2));

    // Final submit
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const lawFirm = document.getElementById('lawFirm').value.trim();
        if (!lawFirm) {
            showNotification('Please enter your law firm name.', 'error');
            return;
        }

        contactFormData = {
            firstName: document.getElementById('firstName').value.trim(),
            lastName: document.getElementById('lastName').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            lawFirm,
            website: document.getElementById('website').value.trim()
        };

        console.log('Contact form data stored:', contactFormData);

        showNotification('Thank you! Access your calculator below.', 'success');

        const calculatorSection = document.getElementById('calculator');
        if (calculatorSection) {
            calculatorSection.style.display = 'block';
            setTimeout(() => {
                calculatorSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                const adSpendInput = document.getElementById('adSpend');
                if (adSpendInput) setTimeout(() => adSpendInput.focus(), 350);
            }, 300);
        }
    });
}

function submitToDatabase(formData) {
    console.log('Submitting to database...');

    // Save to localStorage (fallback)
    saveSubmission(formData);

    fetch('/api/leads', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    })
        .then(async (res) => {
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`DB write failed: ${res.status} ${text}`);
            }
            return res.json();
        })
        .then(() => {
            console.log('Complete data submitted successfully to database');
            showNotification('Thank you! Your results are ready.', 'success');
        })
        .catch((err) => {
            console.error(err);
            showNotification('Data saved locally but failed to save to database.', 'error');
        });
}

function saveSubmission(formData) {
    console.log('Saving submission to localStorage...');
    
    const submissions = JSON.parse(localStorage.getItem('submissions') || '[]');
    const submission = {
        ...formData,
        id: Date.now(),
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString()
    };
    submissions.push(submission);
    localStorage.setItem('submissions', JSON.stringify(submissions));
    
    console.log('Submission saved:', submission);
}

function initializeCallbackButton() {
    const callbackBtn = document.getElementById('requestCallbackBtn');

    if (!callbackBtn) {
        console.log('Callback button not found');
        return;
    }

    callbackBtn.addEventListener('click', function() {
        if (!contactFormData) {
            showNotification('Contact information not found. Please refresh and try again.', 'error');
            return;
        }

        // Disable button to prevent multiple clicks
        callbackBtn.disabled = true;
        callbackBtn.textContent = 'Requesting...';

        // Send callback request
        requestCallback();
    });
}

function requestCallback() {
    const callbackBtn = document.getElementById('requestCallbackBtn');

    if (!contactFormData || !contactFormData.email) {
        showNotification('Unable to process callback request.', 'error');
        if (callbackBtn) {
            callbackBtn.disabled = false;
            callbackBtn.textContent = 'Request a Callback';
        }
        return;
    }

    const callbackData = {
        email: contactFormData.email,
        requestedCallback: true
    };

    fetch('/api/leads/callback', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(callbackData)
    })
        .then(async (res) => {
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Callback request failed: ${res.status} ${text}`);
            }
            return res.json();
        })
        .then(() => {
            console.log('Callback request successful');
            showNotification('Callback requested! We\'ll contact you within 24 hours.', 'success');
            if (callbackBtn) {
                callbackBtn.textContent = 'Callback Requested ✓';
                callbackBtn.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
            }
        })
        .catch((err) => {
            console.error(err);
            showNotification('Unable to process callback request. Please try again.', 'error');
            if (callbackBtn) {
                callbackBtn.disabled = false;
                callbackBtn.textContent = 'Request a Callback';
            }
        });
}

function showNotification(message, type) {
    console.log('Showing notification:', message, type);

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Style the notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        font-weight: bold;
        z-index: 1000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 300px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    `;
    
    // Set background color based on type
    switch (type) {
        case 'success':
            notification.style.backgroundColor = '#28a745';
            break;
        case 'error':
            notification.style.backgroundColor = '#dc3545';
            break;
        case 'info':
            notification.style.backgroundColor = '#17a2b8';
            break;
        default:
            notification.style.backgroundColor = '#6c757d';
    }
    
    // Add to page
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Hide and remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}
