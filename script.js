// Main script for legal leads landing page

let lastCalculation = null;
let cpqlTarget = 700;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded');

    loadCpqlTarget()
        .catch((err) => console.error('Failed to load CPQL target', err))
        .finally(() => {
            // Initialize CPQL calculator
            initializeCPLCalculator();

            // Initialize contact form
            initializeContactForm();
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

    const hero = document.getElementById('heroCpqlTarget');
    if (hero) hero.textContent = formatted;

    const targetCpl = document.getElementById('targetCpl');
    if (targetCpl) targetCpl.textContent = formatted;

    const resultGuaranteed = document.getElementById('resultGuaranteedCpql');
    if (resultGuaranteed) resultGuaranteed.textContent = formatted;
}

function openContactForm() {
    const contactSection = document.getElementById('contact');
    if (contactSection) {
        contactSection.style.display = 'block';
        contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    const firstName = document.getElementById('firstName');
    if (firstName) {
        setTimeout(() => firstName.focus(), 350);
    }
}

function initializeCPLCalculator() {
    const form = document.getElementById('cplForm');
    const resultsDiv = document.getElementById('calculatorResults');
    const resultsCtaBtn = document.getElementById('resultsCtaBtn');
    
    if (!form || !resultsDiv) {
        console.log('Calculator form or results div not found');
        return;
    }

    if (resultsCtaBtn) {
        resultsCtaBtn.addEventListener('click', function() {
            openContactForm();
        });
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
        
        console.log('Calculated savings:', { monthlySavings, annualSavings });

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
            percentageSavings
        };
        
        // Display results
        displayResults({
            currentCpl,
            guaranteedCpl,
            leadsCount,
            totalMonthlySpend,
            newMonthlySpend,
            monthlySavings,
            annualSavings,
            percentageSavings
        });

        updateResultsSection({
            currentCpl,
            guaranteedCpl,
            leadsCount,
            totalMonthlySpend,
            newMonthlySpend,
            monthlySavings,
            annualSavings,
            percentageSavings
        });

        populateHiddenCalculationFields(lastCalculation);

        const resultsSection = document.getElementById('results');
        if (resultsSection) {
            resultsSection.style.display = 'block';
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        const contactSection = document.getElementById('contact');
        if (contactSection) {
            contactSection.style.display = 'block';
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
    setText('resultGuaranteedCpql', `$${Math.round(data.guaranteedCpl).toLocaleString()}`);
    setText('resultNewMonthlySpend', `$${Math.round(data.newMonthlySpend).toLocaleString()}`);
    setText('resultMonthlySavings', `$${Math.round(data.monthlySavings).toLocaleString()}`);
    setText('resultAnnualSavings', `$${Math.round(data.annualSavings).toLocaleString()}`);
    setText('resultCpqlReduction', `${(Number.isFinite(data.percentageSavings) ? data.percentageSavings : 0).toFixed(1)}%`);
    setText('resultLeadsCount', `${Math.round(data.leadsCount).toLocaleString()}`);

    setValueClass('resultMonthlySavings', data.monthlySavings >= 0 ? 'is-positive' : 'is-negative');
    setValueClass('resultAnnualSavings', data.annualSavings >= 0 ? 'is-positive' : 'is-negative');
    setValueClass('resultCpqlReduction', data.percentageSavings >= 0 ? 'is-positive' : 'is-negative');
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
}

function displayResults(data) {
    const resultsDiv = document.getElementById('calculatorResults');
    
    if (!resultsDiv) {
        console.log('Results div not found');
        return;
    }
    
    console.log('Displaying results:', data);
    
    resultsDiv.innerHTML = `
        <div class="calculator-results">
            <h3>Your PI Case CPQL Savings</h3>
            <div class="result-item">
                <span>Current Monthly Spend:</span>
                <span>$${data.totalMonthlySpend.toLocaleString()}</span>
            </div>
            <div class="result-item">
                <span>Current CPQL:</span>
                <span>$${data.currentCpl.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
            </div>
            <div class="result-item">
                <span>Guaranteed CPQL:</span>
                <span>$${data.guaranteedCpl.toLocaleString()}</span>
            </div>
            <div class="result-item">
                <span>New Monthly Spend:</span>
                <span>$${data.newMonthlySpend.toLocaleString()}</span>
            </div>
            <div class="result-item highlight">
                <span>Monthly Savings:</span>
                <span>$${data.monthlySavings.toLocaleString()}</span>
            </div>
            <div class="result-item highlight">
                <span>Annual Savings:</span>
                <span>$${data.annualSavings.toLocaleString()}</span>
            </div>
            <div class="result-item highlight">
                <span>CPQL Reduction:</span>
                <span>${Number.isFinite(data.percentageSavings) ? data.percentageSavings.toFixed(1) : '0.0'}%</span>
            </div>
            <div class="result-item">
                <span>PI Leads per Month:</span>
                <span>${data.leadsCount}</span>
            </div>
        </div>
    `;
    
    resultsDiv.style.display = 'block';
    console.log('Results displayed successfully');
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
        const formData = {
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            lawFirm: document.getElementById('lawFirm').value,
            calcCurrentMonthlySpend: document.getElementById('calcCurrentMonthlySpend')?.value || '',
            calcCurrentCpql: document.getElementById('calcCurrentCpql')?.value || '',
            calcGuaranteedCpql: document.getElementById('calcGuaranteedCpql')?.value || '',
            calcNewMonthlySpend: document.getElementById('calcNewMonthlySpend')?.value || '',
            calcMonthlySavings: document.getElementById('calcMonthlySavings')?.value || '',
            calcAnnualSavings: document.getElementById('calcAnnualSavings')?.value || '',
            calcCpqlReduction: document.getElementById('calcCpqlReduction')?.value || '',
            calcLeadsCount: document.getElementById('calcLeadsCount')?.value || ''
        };
        
        console.log('Form data:', formData);
        
        // Validate form
        if (!validateForm(formData)) {
            console.log('Form validation failed');
            return;
        }
        
        // Submit form
        submitContactForm(formData);
    });
}

function validateForm(data) {
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
    
    console.log('Form validation passed');
    return true;
}

function submitContactForm(formData) {
    console.log('Processing form submission...');

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
            showNotification('Thank you! Your info was submitted successfully.', 'success');
            document.getElementById('contactForm').reset();
            console.log('Form submitted successfully (DB)');
        })
        .catch((err) => {
            console.error(err);
            showNotification('Submission saved locally, but failed to save to database.', 'error');
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
