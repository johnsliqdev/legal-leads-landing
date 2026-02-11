// Main script for legal leads landing page

document.addEventListener('DOMContentLoaded', function() {
    // Initialize CPQL calculator
    initializeCPLCalculator();
    
    // Initialize contact form
    initializeContactForm();
});

function initializeCPLCalculator() {
    const form = document.getElementById('cplForm');
    const resultsDiv = document.getElementById('calculatorResults');
    
    if (!form || !resultsDiv) return;
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form values
        const currentCpl = parseFloat(document.getElementById('currentCpl').value) || 0;
        const leadsPerMonth = parseFloat(document.getElementById('leadsPerMonth').value) || 0;
        const monthlySpend = currentCpl * leadsPerMonth;
        
        // Calculate savings with guaranteed CPL
        const guaranteedCpl = 700; // This should be loaded from localStorage
        const newMonthlySpend = guaranteedCpl * leadsPerMonth;
        const monthlySavings = monthlySpend - newMonthlySpend;
        const annualSavings = monthlySavings * 12;
        
        // Display results
        displayResults({
            currentCpl,
            guaranteedCpl,
            leadsPerMonth,
            monthlySpend,
            newMonthlySpend,
            monthlySavings,
            annualSavings
        });
    });
}

function displayResults(data) {
    const resultsDiv = document.getElementById('calculatorResults');
    
    resultsDiv.innerHTML = `
        <div class="calculator-results">
            <h3>Your Savings</h3>
            <div class="result-item">
                <span>Current Monthly Spend:</span>
                <span>$${data.monthlySpend.toLocaleString()}</span>
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
            <div class="result-item">
                <span>Guaranteed CPL:</span>
                <span>$${data.guaranteedCpl}</span>
            </div>
        </div>
    `;
    
    resultsDiv.style.display = 'block';
}

function initializeContactForm() {
    const form = document.getElementById('contactForm');
    
    if (!form) return;
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form data
        const formData = {
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            lawFirm: document.getElementById('lawFirm').value,
            currentCpl: document.getElementById('currentCpl').value,
            savings: document.getElementById('savings').value
        };
        
        // Validate form
        if (!validateForm(formData)) {
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
            showNotification(`Please fill in all required fields`, 'error');
            return false;
        }
    }
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        showNotification('Please enter a valid email address', 'error');
        return false;
    }
    
    return true;
}

function submitContactForm(formData) {
    // Show loading state
    showNotification('Submitting your information...', 'info');
    
    // Save to localStorage ONLY
    saveSubmission(formData);
    
    // Show success message
    showNotification('Thank you for your submission! We will contact you soon.', 'success');
    
    // Reset form
    document.getElementById('contactForm').reset();
    
    // Hide results after delay
    setTimeout(() => {
        document.getElementById('calculatorResults').style.display = 'none';
        // window.location.href = '/thank-you';
    }, 2000);
}

function saveSubmission(formData) {
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
    
    console.log('Form submitted:', submission);
}

function showNotification(message, type) {
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
