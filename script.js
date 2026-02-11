// Update target CPQL display on page load
function updateTargetCpqlDisplay() {
    const targetCpl = localStorage.getItem('cpqlTarget') ? parseFloat(localStorage.getItem('cpqlTarget')) : 700;
    
    // Update target CPQL in results section
    const targetElement = document.getElementById('targetCpl');
    if (targetElement) {
        targetElement.textContent = `$${targetCpl.toFixed(2)}`;
    }
    
    // Update hero subtitle CPQL target
    const heroElement = document.getElementById('heroCpqlTarget');
    if (heroElement) {
        heroElement.textContent = `$${targetCpl.toFixed(2)}`;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Update target CPQL display
    updateTargetCpqlDisplay();
    const cplForm = document.getElementById('cplForm');
    const contactForm = document.getElementById('contactForm');
    const resultsSection = document.getElementById('results');
    const contactSection = document.getElementById('contact');
    
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Load CPQL target from localStorage
    function loadCpqlTarget() {
        const saved = localStorage.getItem('cpqlTarget');
        return saved ? parseFloat(saved) : 700;
    }
    
    // CPL Calculator
    cplForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const adSpend = parseFloat(document.getElementById('adSpend').value) || 0;
        const marketingFees = parseFloat(document.getElementById('marketingFees').value) || 0;
        const leadsCount = parseFloat(document.getElementById('leadsCount').value) || 0;
        
        if (leadsCount === 0) {
            showNotification('Please enter a valid number of leads', 'error');
            return;
        }
        
        const totalSpend = adSpend + marketingFees;
        const currentCpl = totalSpend / leadsCount;
        
        displayResults(currentCpl);
    });
    
    function displayResults(currentCpl) {
        const guaranteedCpl = loadCpqlTarget();
        const savingsPercentage = ((currentCpl - guaranteedCpl) / currentCpl * 100).toFixed(1);
        const monthlySavings = ((currentCpl - guaranteedCpl) * (document.getElementById('leadsCount').value || 0)).toFixed(0);
        
        // Update results display
        document.getElementById('currentCpl').textContent = `$${currentCpl.toFixed(2)}`;
        document.getElementById('targetCpl').textContent = `$${guaranteedCpl.toFixed(2)}`;
        document.getElementById('savingsAmount').textContent = `${savingsPercentage}%`;
        
        // Update savings description
        const savingsDesc = document.getElementById('savingsDesc');
        if (currentCpl > guaranteedCpl) {
            savingsDesc.textContent = `compared to your current CPQL (Save $${monthlySavings}/month)`;
        } else if (currentCpl === guaranteedCpl) {
            savingsDesc.textContent = 'same as your current CPQL';
            document.getElementById('savingsAmount').textContent = '0%';
        } else {
            savingsDesc.textContent = 'You already have a great CPQL!';
            document.getElementById('savingsAmount').textContent = 'Contact us';
        }
        
        // Show results section with animation
        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
        
        // Show contact section after a delay
        setTimeout(() => {
            contactSection.style.display = 'block';
            contactSection.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }, 1000);
    }
    
    // Contact Form
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = {
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            lawFirm: document.getElementById('lawFirm').value,
            currentCpl: document.getElementById('currentCpl').textContent,
            savings: document.getElementById('savingsAmount').textContent
        };
        
        // Validate email
        if (!validateEmail(formData.email)) {
            showNotification('Please enter a valid email address', 'error');
            return;
        }
        
        // Validate phone
        if (!validatePhone(formData.phone)) {
            showNotification('Please enter a valid phone number', 'error');
            return;
        }
        
        // Simulate form submission
        submitContactForm(formData);
    });
    
    function validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    function validatePhone(phone) {
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
    }
    
    function submitContactForm(formData) {
        // Save submission to localStorage
        saveSubmission(formData);
        
        // Show loading state
        const submitBtn = document.querySelector('.submit-btn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Submitting...';
        submitBtn.disabled = true;
        
        // Simulate API call
        setTimeout(() => {
            // Log the form data (in production, this would be sent to a server)
            console.log('Form submitted:', formData);
            
            // Show success message
            showNotification('Thank you! We will contact you within 24 hours.', 'success');
            
            // Reset form
            contactForm.reset();
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            
            // Optional: Redirect to a thank you page or show a success modal
            setTimeout(() => {
                // You could redirect here if needed
                // window.location.href = '/thank-you';
            }, 2000);
        }, 1500);
    }
    
    // Save submission to localStorage and Google Sheets
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
        
        // Simple direct approach - just open the Google Apps Script URL
        const googleScriptUrl = 'https://script.google.com/macros/s/AKfycbykpFD-LwYU_Osadg2u_fyFKKwCyRGmuT8ILxHqlq-uqgLdwgAuRrtiZjjNiYHwq-WhnA/exec';
        const dataParam = encodeURIComponent(JSON.stringify({
            action: 'append',
            data: submission
        }));
        
        // Open in hidden iframe to avoid redirect
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = googleScriptUrl + '?data=' + dataParam;
        document.body.appendChild(iframe);
        
        // Clean up after a delay
        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 2000);
        
        console.log('Simple approach - Google Sheets submission sent');
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
            border-radius: 10px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        `;
        
        if (type === 'success') {
            notification.style.background = 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)';
        } else {
            notification.style.background = 'linear-gradient(135deg, #ff006e 0%, #ff4081 100%)';
        }
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
    
    // Add input formatting for phone number
    document.getElementById('phone').addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 0) {
            if (value.length <= 3) {
                value = value;
            } else if (value.length <= 6) {
                value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
            } else if (value.length <= 10) {
                value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6)}`;
            } else {
                value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6, 10)}`;
            }
        }
        e.target.value = value;
    });
    
    // Add number formatting for currency inputs
    ['adSpend', 'marketingFees'].forEach(id => {
        document.getElementById(id).addEventListener('blur', function(e) {
            const value = parseFloat(e.target.value);
            if (!isNaN(value) && value > 0) {
                e.target.value = value.toFixed(2);
            }
        });
    });
    
    // Add animation to cards on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe all cards
    document.querySelectorAll('.calculator-card, .results-card, .contact-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
});
