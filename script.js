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
                ...contactFormData,
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

    setText('resultCurrentMonthlySpend', `$${Math.round(data.totalMonthlySpend).toLocaleString()}`);
    setText('resultCurrentCpql', `$${Math.round(data.currentCpl).toLocaleString()}`);
    setText('resultNewMonthlySpend', `$${Math.round(data.newMonthlySpend).toLocaleString()}`);
    setText('resultMonthlySavings', `$${Math.round(data.monthlySavings).toLocaleString()}`);
    setText('resultAnnualSavings', `$${Math.round(data.annualSavings).toLocaleString()}`);
    setText('resultCpqlReduction', `${(Number.isFinite(data.percentageSavings) ? data.percentageSavings : 0).toFixed(1)}%`);
    setText('resultLeadsCount', `${Math.round(data.leadsCount).toLocaleString()}`);
    setText('resultSameBudgetLeads', `${Math.round(data.sameBudgetLeads).toLocaleString()}`);

    setValueClass('resultMonthlySavings', data.monthlySavings >= 0 ? 'is-positive' : 'is-negative');
    setValueClass('resultAnnualSavings', data.annualSavings >= 0 ? 'is-positive' : 'is-negative');
    setValueClass('resultCpqlReduction', data.percentageSavings >= 0 ? 'is-positive' : 'is-negative');
    setValueClass('resultSameBudgetLeads', 'is-positive');
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
    
    if (!form) {
        console.log('Contact form not found');
        return;
    }
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log('Contact form submitted');

        // Get form data
        contactFormData = {
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            lawFirm: document.getElementById('lawFirm').value
        };

        console.log('Contact form data stored:', contactFormData);

        // Validate form
        if (!validateContactForm(contactFormData)) {
            console.log('Form validation failed');
            return;
        }

        // Show calculator without submitting to database yet
        showNotification('Thank you! Access your calculator below.', 'success');

        const calculatorSection = document.getElementById('calculator');
        if (calculatorSection) {
            calculatorSection.style.display = 'block';
            setTimeout(() => {
                calculatorSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

                // Focus on first input
                const adSpendInput = document.getElementById('adSpend');
                if (adSpendInput) {
                    setTimeout(() => adSpendInput.focus(), 350);
                }
            }, 300);
        }
    });
}

function validateContactForm(data) {
    const required = ['firstName', 'lastName', 'email', 'phone', 'lawFirm'];

    for (const field of required) {
        if (!data[field] || data[field].trim() === '') {
            console.log('Validation failed - missing field:', field);
            showNotification(`Please fill in all required fields`, 'error');
            return false;
        }
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        console.log('Validation failed - invalid email:', data.email);
        showNotification('Please enter a valid email address', 'error');
        return false;
    }

    console.log('Contact form validation passed');
    return true;
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
