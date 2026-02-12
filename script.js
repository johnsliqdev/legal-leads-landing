// Main script for legal leads landing page

document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded');
    
    // Initialize CPQL calculator
    initializeCPLCalculator();
    
    // Initialize contact form
    initializeContactForm();
});

function initializeCPLCalculator() {
    const form = document.getElementById('cplForm');
    const resultsDiv = document.getElementById('calculatorResults');
    
    if (!form || !resultsDiv) {
        console.log('Calculator form or results div not found');
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
        const guaranteedCpl = 700;
        const newMonthlySpend = guaranteedCpl * leadsCount;
        const monthlySavings = totalMonthlySpend - newMonthlySpend;
        const annualSavings = monthlySavings * 12;
        
        console.log('Calculated savings:', { monthlySavings, annualSavings });

        const percentageSavings = currentCpl > 0
            ? ((currentCpl - guaranteedCpl) / currentCpl) * 100
            : 0;
        
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
    });
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
            currentCpl: document.getElementById('currentCpl').value,
            savings: document.getElementById('savings').value
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
    
    // Save to localStorage
    saveSubmission(formData);
    
    // Show success message
    showNotification('Thank you for your submission! We will contact you soon.', 'success');
    
    // Reset form
    document.getElementById('contactForm').reset();
    
    console.log('Form submitted successfully');
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
