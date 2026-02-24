// Main script for legal leads landing page

let lastCalculation = null;
let cpqlTarget = 700;
let contactFormData = null;
let leadId = null;

// YouTube video tracking
let ytPlayer = null;
let ytApiReady = false;
let videoTrackingInterval = null;
let maxWatchedSeconds = 0;

// Called by YouTube API when ready
function onYouTubeIframeAPIReady() {
    ytApiReady = true;
    // If video section is already visible, create the player now
    var videoSection = document.getElementById('videoSection');
    if (videoSection && videoSection.style.display !== 'none') {
        initYouTubePlayer();
    }
}

// Create player only when video section is visible
function initYouTubePlayer() {
    if (ytPlayer || !ytApiReady) return;
    var container = document.getElementById('ytPlayer');
    if (!container) return;
    ytPlayer = new YT.Player('ytPlayer', {
        width: '100%',
        height: '400',
        videoId: 'kvK3G0-ewdQ',
        playerVars: {
            rel: 0,
            modestbranding: 1,
            enablejsapi: 1,
            origin: window.location.origin
        },
        events: {
            onStateChange: onPlayerStateChange
        }
    });
    // Style the iframe after it's created
    var checkIframe = setInterval(function() {
        var iframe = document.querySelector('#ytPlayer iframe, iframe#ytPlayer');
        if (iframe) {
            iframe.style.borderRadius = '12px';
            clearInterval(checkIframe);
        }
    }, 100);
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        startVideoTracking();
    } else if (event.data === YT.PlayerState.PAUSED) {
        stopVideoTracking(false);
    } else if (event.data === YT.PlayerState.ENDED) {
        stopVideoTracking(true);
    }
}

function startVideoTracking() {
    if (videoTrackingInterval) return;
    videoTrackingInterval = setInterval(function() {
        if (!ytPlayer || typeof ytPlayer.getCurrentTime !== 'function') return;
        var currentTime = Math.round(ytPlayer.getCurrentTime());
        var duration = Math.round(ytPlayer.getDuration());
        if (duration <= 0) return;
        maxWatchedSeconds = Math.max(maxWatchedSeconds, currentTime);
        var percent = Math.min(100, Math.round((maxWatchedSeconds / duration) * 100));
        patchLead({ videoWatchSeconds: maxWatchedSeconds, videoWatchPercent: percent });
    }, 5000);
}

function stopVideoTracking(ended) {
    if (videoTrackingInterval) {
        clearInterval(videoTrackingInterval);
        videoTrackingInterval = null;
    }
    if (!ytPlayer || typeof ytPlayer.getCurrentTime !== 'function') return;
    var currentTime = Math.round(ytPlayer.getCurrentTime());
    var duration = Math.round(ytPlayer.getDuration());
    if (duration <= 0) return;
    maxWatchedSeconds = Math.max(maxWatchedSeconds, currentTime);
    var percent = ended ? 100 : Math.min(100, Math.round((maxWatchedSeconds / duration) * 100));
    patchLead({ videoWatchSeconds: maxWatchedSeconds, videoWatchPercent: percent });
}

// Booking iframe deferred loading
function loadBookingWidget() {
    var iframe = document.getElementById('bookingIframe');
    if (iframe && !iframe.src) {
        iframe.src = 'https://api.leadconnectorhq.com/widget/booking/swe1lSedf4hVYFTLSTIc';
        // Load the form embed script the widget needs
        if (!document.getElementById('ghlFormEmbed')) {
            var s = document.createElement('script');
            s.id = 'ghlFormEmbed';
            s.src = 'https://link.msgsndr.com/js/form_embed.js';
            document.body.appendChild(s);
        }
    }
}

// Load editable content from CMS
async function loadPageContent() {
    try {
        var res = await fetch('/api/content', { method: 'GET' });
        if (!res.ok) return;
        var content = await res.json();

        // Update title
        if (content.pageTitle) document.title = content.pageTitle;

        // Update meta description
        if (content.metaDescription) {
            var meta = document.querySelector('meta[name="description"]');
            if (meta) meta.setAttribute('content', content.metaDescription);
        }

        // Update data-content elements
        document.querySelectorAll('[data-content]').forEach(function(el) {
            var key = el.getAttribute('data-content');
            if (content[key]) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.value = content[key];
                } else {
                    el.innerHTML = content[key];
                }
            }
        });
    } catch (err) {
        console.error('Failed to load page content:', err);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded');

    loadPageContent();

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

        // Reset all flow sections after calculator to ensure proper path on recalculation
        const sectionsToReset = ['resultsSection', 'sliqProjectionSection', 'qualificationSection', 'videoSection', 'bookingSection'];
        sectionsToReset.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) section.style.display = 'none';
        });

        // Reset video tracking
        maxWatchedSeconds = 0;
        if (videoTrackingInterval) {
            clearInterval(videoTrackingInterval);
            videoTrackingInterval = null;
        }
        // Destroy and reset player so it can be re-created when section is visible again
        if (ytPlayer && typeof ytPlayer.destroy === 'function') {
            ytPlayer.destroy();
            ytPlayer = null;
            // Re-create the placeholder div
            var videoContainer = document.querySelector('#videoSection .video-container');
            if (videoContainer) {
                videoContainer.innerHTML = '<div id="ytPlayer"></div>';
            }
        }

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
            sameBudgetLeads,
            adSpend
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
            sameBudgetLeads,
            adSpend
        });

        populateHiddenCalculationFields(lastCalculation);

        // Submit calculator data to database
        if (contactFormData) {
            const calcFields = {
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

            if (leadId) {
                // Incremental path: PATCH calc fields + re-send contact as safety net
                console.log('PATCHing calc data to lead:', leadId);
                patchLead({
                    email: contactFormData.email,
                    phone: contactFormData.phone,
                    website: contactFormData.website,
                    ...calcFields
                }).then(() => showNotification('Thank you! Your results are ready.', 'success'));
            } else {
                // Fallback: full insert (step 1 POST failed)
                const completeFormData = {
                    email: contactFormData.email,
                    phone: contactFormData.phone,
                    website: contactFormData.website || '',
                    ...calcFields
                };
                console.log('Fallback: full insert:', completeFormData);
                submitToDatabase(completeFormData);
            }
        }
    });
}

function updateResultsSection(data) {
    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    // Populate results in the flow
    setText('resultCurrentSpend', `$${Math.round(data.totalMonthlySpend).toLocaleString()}`);
    setText('resultCurrentCpql', `$${Math.round(data.currentCpl).toLocaleString()}`);
    setText('resultLeadsCount', `${Math.round(data.leadsCount).toLocaleString()}`);

    // Show results section and scroll to it
    const resultsSection = document.getElementById('resultsSection');
    if (resultsSection) {
        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Calculate and show Sliq projections
    const targetCpql = data.guaranteedCpl;
    const currentCpql = data.currentCpl;
    const currentSpend = data.totalMonthlySpend;
    const currentLeads = data.leadsCount;

    // Check if ad spend is less than $5000
    const minBudget = 5000;
    const isLowBudget = data.adSpend < minBudget;
    const minimumTotalBudget = minBudget + 3500; // $8,500 total ($5k ad + $3.5k management)
    const projectedLeadsWithMinBudget = Math.round(minimumTotalBudget / targetCpql);

    // If low budget BUT generating more leads than minimum budget would, treat as optimal
    const isOptimal = (currentCpql > 0 && currentCpql <= targetCpql) ||
                      (isLowBudget && currentLeads > projectedLeadsWithMinBudget);

    // Update CTA button based on optimal status
    const qualBtn = document.getElementById('showQualificationBtn');
    if (qualBtn) {
        qualBtn.setAttribute('data-optimal', isOptimal ? 'true' : 'false');
    }

    if (isLowBudget && currentLeads <= projectedLeadsWithMinBudget) {
        // Budget is too low AND not performing exceptionally - show minimum budget requirement
        setText('projectionHeading', 'Your Current Spend Is Below Legal Market Minimums');
        setText('projectionDesc', 'In the competitive legal advertising space, a minimum total monthly investment of $8,500 is required to see meaningful results');
        setText('projectionLabel1', 'Minimum Monthly Budget Required');
        setText('projectionLabel2', 'What You Could Generate');
        setText('projectedLeadRange', `$${minimumTotalBudget.toLocaleString()}/mo`);
        setText('cpqlReduction', `${projectedLeadsWithMinBudget} qualified leads`);
        setText('projectionSubtext1', '');
        setText('projectionSubtext2', '');

        // Update CTA for low budget
        const ctaHeading = document.querySelector('#sliqProjectionSection .results-cta h4');
        const ctaText = document.querySelector('#sliqProjectionSection .results-cta p');
        if (ctaHeading) ctaHeading.textContent = 'Ready to Scale to Minimum Viable Budget?';
        if (ctaText) ctaText.textContent = 'Let\'s discuss how to get you to the results you deserve';
        if (qualBtn) qualBtn.textContent = 'Talk to Our Team →';
    } else if (isOptimal) {
        // Client is already performing optimally
        setText('projectionHeading', 'You\'re Already Performing Optimally');
        setText('projectionDesc', 'Your Cost Per Qualified Lead is excellent. Let\'s scale and optimize your current spend.');

        // Left box: Reduce Paid Dependency
        setText('projectionLabel1', 'Reduce Paid Dependency');
        setText('projectedLeadRange', '30-50% Ad Spend Reduction');
        setText('projectionSubtext1', 'We Build SEO/GEO assets that generate cases at $0 ad cost over 12 months');

        // Right box: Get More Cases at No Extra Ad Spend
        setText('projectionLabel2', 'Get More Cases at No Extra Ad Spend');
        // Use innerHTML for mixed font sizes
        const cpqlEl = document.getElementById('cpqlReduction');
        if (cpqlEl) {
            cpqlEl.innerHTML = 'Explore Organic Channels <span style="font-size: 0.85em;">- Google, Bing, AI Search (ChatGPT, Gemini, Google AI Overview)</span>';
        }
        setText('projectionSubtext2', 'Most law firms are invisible on Google when people search for lawyers. We\'ll help you show up organically and get cases without paying for ads.');

        // Update CTA for optimal performers
        const ctaHeading = document.querySelector('#sliqProjectionSection .results-cta h4');
        const ctaText = document.querySelector('#sliqProjectionSection .results-cta p');
        if (ctaHeading) ctaHeading.textContent = 'Ready to Scale Your Success?';
        if (ctaText) ctaText.textContent = 'Let\'s discuss how we can help you grow even further';
        if (qualBtn) qualBtn.textContent = 'Schedule a Call →';
    } else {
        // Standard projection flow - not performing optimally
        setText('projectionHeading', 'You\'re Not Performing Optimally — Here\'s What We Can Do For You');
        setText('projectionDesc', 'Based on your current spend and our proven results');
        setText('projectionLabel1', 'Projected Monthly Lead Range');
        setText('projectionLabel2', 'Potential Cost Per Qualified Lead Reduction');

        // Project lead range with same budget
        let projectedLeadsLow = Math.round(currentSpend / (targetCpql * 1.2)); // Conservative estimate
        let projectedLeadsHigh = Math.round(currentSpend / (targetCpql * 0.8)); // Optimistic estimate

        // Ensure projected range is always higher than current leads
        if (projectedLeadsHigh <= currentLeads) {
            // If our high end is not better than their current, aim for upper range
            projectedLeadsLow = Math.round(currentLeads * 1.3); // 30% more than current
            projectedLeadsHigh = Math.round(currentLeads * 1.8); // 80% more than current
        } else if (projectedLeadsLow <= currentLeads) {
            // If only low end is problematic, adjust it
            projectedLeadsLow = Math.round(currentLeads * 1.1); // At least 10% more than current
        }

        // Calculate CPQL reduction percentage
        const cpqlReduction = Math.round(((currentCpql - targetCpql) / currentCpql) * 100);
        const cpqlReductionLow = Math.max(0, cpqlReduction - 10);
        const cpqlReductionHigh = cpqlReduction + 10;

        setText('projectedLeadRange', `${projectedLeadsLow}-${projectedLeadsHigh} leads`);
        setText('cpqlReduction', `${cpqlReductionLow}-${cpqlReductionHigh}%`);
        setText('projectionSubtext1', '');
        setText('projectionSubtext2', '');

        // Update CTA for non-optimal performers
        const ctaHeading = document.querySelector('#sliqProjectionSection .results-cta h4');
        const ctaText = document.querySelector('#sliqProjectionSection .results-cta p');
        if (ctaHeading) ctaHeading.textContent = 'Ready to Optimize Your Ad Spend and Get More Qualified Leads?';
        if (ctaText) ctaText.textContent = 'Answer a few quick questions to see if you qualify';
        if (qualBtn) qualBtn.textContent = 'Continue to Qualify →';
    }

    // Show projection section
    const projectionSection = document.getElementById('sliqProjectionSection');
    if (projectionSection) {
        projectionSection.style.display = 'block';
    }

    // Legacy code for old results section (if it exists)
    const isOutstanding = data.currentCpl > 0 && data.currentCpl <= data.guaranteedCpl;

    const savingsView = document.getElementById('resultsSavingsView');
    const outstandingView = document.getElementById('resultsOutstandingView');
    const callbackCtaHeading = document.getElementById('callbackCtaHeading');
    const callbackCtaText = document.getElementById('callbackCtaText');
    const callbackBtn = document.getElementById('requestCallbackBtn');

    if (isOutstanding && savingsView && outstandingView) {
        if (savingsView) savingsView.style.display = 'none';
        if (outstandingView) outstandingView.style.display = 'block';
        setText('outstandingCurrentCpql', `$${Math.round(data.currentCpl).toLocaleString()}`);
        if (callbackCtaHeading) callbackCtaHeading.textContent = 'Want to Scale Even Further?';
        if (callbackCtaText) callbackCtaText.textContent = "Even at your elite CPQL, we can help you increase volume with our guarantee.";
        if (callbackBtn) callbackBtn.textContent = 'Discuss My Growth Strategy';
    } else {
        if (savingsView) savingsView.style.display = 'block';
        if (outstandingView) outstandingView.style.display = 'none';
        if (callbackCtaHeading) callbackCtaHeading.textContent = 'Ready to Optimize Your Ad Spend and Get More Qualified Leads?';
        if (callbackCtaText) callbackCtaText.textContent = "Let's talk about how the guarantee works for your firm";
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

    // 1. Contact Form → Show Calculator
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const website = document.getElementById('website').value.trim();
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

            // Store contact data for later use
            contactFormData = { website, email, phone };

            // Lock the form to prevent editing
            document.getElementById('email').disabled = true;
            document.getElementById('phone').disabled = true;
            document.getElementById('website').disabled = true;
            e.target.querySelector('button[type="submit"]').disabled = true;
            e.target.querySelector('button[type="submit"]').textContent = 'Submitted ✓';
            e.target.querySelector('button[type="submit"]').style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';

            // Save to database
            fetch('/api/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ website, email, phone })
            })
                .then(async (res) => {
                    if (!res.ok) throw new Error(`POST failed: ${res.status}`);
                    return res.json();
                })
                .then((data) => {
                    leadId = data.id;
                    console.log('Lead created with id:', leadId);
                })
                .catch((err) => console.error('Contact POST failed:', err));

            // Show calculator
            document.getElementById('calculatorSection').style.display = 'block';
            document.getElementById('calculatorSection').scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }

    // 2. Results → Show Projection
    const showProjectionBtn = document.getElementById('showProjectionBtn');
    if (showProjectionBtn) {
        showProjectionBtn.addEventListener('click', function() {
            document.getElementById('sliqProjectionSection').scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }

    // 3. Projection CTA → Show Qualification or Booking
    const showQualificationBtn = document.getElementById('showQualificationBtn');
    if (showQualificationBtn) {
        showQualificationBtn.addEventListener('click', function() {
            // Check if user is optimal (this will be set by the projection calculation)
            const isOptimalUser = showQualificationBtn.getAttribute('data-optimal') === 'true';

            if (isOptimalUser) {
                // Skip to booking for optimal performers
                document.getElementById('bookingSection').style.display = 'block';
                loadBookingWidget();
                document.getElementById('bookingSection').scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                // Show qualification questions for non-optimal performers
                document.getElementById('qualificationSection').style.display = 'block';
                document.getElementById('qualificationSection').scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    }

    // 4. Qualification Form - Budget tier logic
    const budget10kRadios = document.querySelectorAll('input[name="budget10k"]');
    const budget5kRadios = document.querySelectorAll('input[name="budget5k"]');
    const budgetQuestion2 = document.getElementById('budgetQuestion2');
    const disqualificationMessage = document.getElementById('disqualificationMessage');
    const submitBtn = document.getElementById('qualificationSubmitBtn');

    if (budget10kRadios.length > 0) {
        budget10kRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.value === 'no') {
                    // Show second budget question
                    budgetQuestion2.style.display = 'block';
                    // Make budget5k required
                    budget5kRadios.forEach(r => r.required = true);
                    // Hide disqualification in case it was shown before
                    disqualificationMessage.style.display = 'none';
                    submitBtn.disabled = false;
                } else {
                    // Hide second budget question and disqualification
                    budgetQuestion2.style.display = 'none';
                    disqualificationMessage.style.display = 'none';
                    // Remove required from budget5k
                    budget5kRadios.forEach(r => r.required = false);
                    submitBtn.disabled = false;
                }
            });
        });
    }

    if (budget5kRadios.length > 0) {
        budget5kRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.value === 'no') {
                    // Show disqualification message
                    disqualificationMessage.style.display = 'block';
                    // Disable submit button
                    submitBtn.disabled = true;
                    submitBtn.style.opacity = '0.5';
                    submitBtn.style.cursor = 'not-allowed';
                } else {
                    // Hide disqualification message
                    disqualificationMessage.style.display = 'none';
                    // Enable submit button
                    submitBtn.disabled = false;
                    submitBtn.style.opacity = '1';
                    submitBtn.style.cursor = 'pointer';
                }
            });
        });
    }

    // Qualification Form → Show Video
    const qualificationForm = document.getElementById('qualificationForm');
    if (qualificationForm) {
        qualificationForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const budget10k = document.querySelector('input[name="budget10k"]:checked');
            const budget5k = document.querySelector('input[name="budget5k"]:checked');
            const dedicatedIntake = document.querySelector('input[name="dedicatedIntake"]:checked');
            const usesCRM = document.querySelector('input[name="usesCRM"]:checked');
            const firmDifferentiator = document.getElementById('firmDifferentiator').value.trim();

            // Determine budget commitment value
            let metaBudgetCommitment = '';
            if (budget10k && budget10k.value === 'yes') {
                metaBudgetCommitment = '10k';
            } else if (budget5k && budget5k.value === 'yes') {
                metaBudgetCommitment = '5k';
            } else if (budget5k && budget5k.value === 'no') {
                // Disqualified - shouldn't reach here due to disabled button
                showNotification('Minimum budget requirement not met.', 'error');
                return;
            }

            if (!budget10k || !dedicatedIntake || !usesCRM) {
                showNotification('Please answer all required questions.', 'error');
                return;
            }

            // Save qualification data
            patchLead({
                metaBudgetCommitment,
                dedicatedIntake: dedicatedIntake.value,
                usesCRM: usesCRM.value,
                firmDifferentiator: firmDifferentiator || null
            });

            // Show video
            document.getElementById('videoSection').style.display = 'block';
            document.getElementById('videoSection').scrollIntoView({ behavior: 'smooth', block: 'center' });
            initYouTubePlayer();
        });
    }

    // 5. Video → Show Booking
    const showBookingBtn = document.getElementById('showBookingBtn');
    if (showBookingBtn) {
        showBookingBtn.addEventListener('click', function() {
            document.getElementById('bookingSection').style.display = 'block';
            loadBookingWidget();
            document.getElementById('bookingSection').scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }
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
        .then((data) => {
            console.log('Complete data submitted successfully to database');
            if (data.id) leadId = data.id;
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

function patchLead(fields) {
    if (!leadId) {
        console.warn('patchLead called without leadId; skipping');
        return Promise.resolve(null);
    }
    return fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leadId, ...fields })
    })
        .then(async (res) => {
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`PATCH failed: ${res.status} ${text}`);
            }
            return res.json();
        })
        .catch((err) => {
            console.error('patchLead error:', err);
            return null;
        });
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

    const onSuccess = () => {
        console.log('Callback request successful');
        showNotification('Callback requested! We\'ll contact you within 24 hours.', 'success');
        if (callbackBtn) {
            callbackBtn.textContent = 'Callback Requested \u2713';
            callbackBtn.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
        }
    };

    const onError = (err) => {
        console.error(err);
        showNotification('Unable to process callback request. Please try again.', 'error');
        if (callbackBtn) {
            callbackBtn.disabled = false;
            callbackBtn.textContent = 'Request a Callback';
        }
    };

    if (leadId) {
        patchLead({ requestedCallback: true })
            .then((result) => { if (result) onSuccess(); else onError(new Error('PATCH returned null')); });
    } else {
        fetch('/api/leads/callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: contactFormData.email, requestedCallback: true })
        })
            .then(async (res) => {
                if (!res.ok) throw new Error(`Callback failed: ${res.status}`);
                return res.json();
            })
            .then(onSuccess)
            .catch(onError);
    }
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

// Help Modal Functionality
const modalContent = {
    adSpendModal: {
        title: "Monthly Ad Spend",
        body: "This is the total amount you spend directly on advertising platforms (Google Ads, Meta Ads, etc.) each month, not including agency fees or management costs."
    },
    marketingFeesModal: {
        title: "Monthly Marketing Fees",
        body: "This includes all costs beyond direct ad spend: agency fees, software subscriptions, marketing tools, freelancers, and any other marketing-related expenses."
    },
    qualifiedLeadModal: {
        title: "What is a Qualified Lead?",
        body: "Not every inquiry is a lead. A qualified lead is a prospect with confirmed intent, a viable case, and a high probability to retain — someone with an extremely high chance to close, not just a name on a list."
    }
};

document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('helpModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const closeBtn = document.querySelector('.modal-close');
    const helpIcons = document.querySelectorAll('.help-icon');

    // Open modal when help icon is clicked
    helpIcons.forEach(icon => {
        icon.addEventListener('click', function(e) {
            e.preventDefault();
            const modalId = this.getAttribute('data-modal');
            const content = modalContent[modalId];
            
            if (content) {
                modalTitle.textContent = content.title;
                modalBody.textContent = content.body;
                modal.style.display = 'block';
            }
        });
    });

    // Close modal when X is clicked
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    }

    // Close modal when clicking outside the modal content
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Close modal on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            modal.style.display = 'none';
        }
    });
});

// Progress Bar Functionality
document.addEventListener('DOMContentLoaded', function() {
    const progressBar = document.getElementById('progressBar');
    const progressItems = document.querySelectorAll('.progress-item');

    if (!progressBar || progressItems.length === 0) return;

    // Make progress items clickable
    progressItems.forEach(item => {
        item.addEventListener('click', function() {
            const sectionId = this.getAttribute('data-section');
            let targetSection;

            if (sectionId === 'hero') {
                targetSection = document.getElementById('hero');
            } else {
                targetSection = document.getElementById(sectionId);
            }

            if (targetSection && targetSection.style.display !== 'none') {
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    });

    // Update progress bar based on scroll and visible sections
    function updateProgressBar() {
        // Check each section
        const sections = [
            { id: 'hero', element: document.getElementById('hero') },
            { id: 'calculatorSection', element: document.getElementById('calculatorSection') },
            { id: 'resultsSection', element: document.getElementById('resultsSection') },
            { id: 'sliqProjectionSection', element: document.getElementById('sliqProjectionSection') },
            { id: 'qualificationSection', element: document.getElementById('qualificationSection') },
            { id: 'videoSection', element: document.getElementById('videoSection') },
            { id: 'bookingSection', element: document.getElementById('bookingSection') }
        ];

        // Find the last visible (unlocked) section - this helps determine completion
        let lastVisibleIndex = -1;
        for (let i = sections.length - 1; i >= 0; i--) {
            const section = sections[i];
            if (section.element && section.element.style.display !== 'none') {
                lastVisibleIndex = i;
                break;
            }
        }

        // Find the currently active section (the one in viewport center)
        let activeSection = null;
        let activeSectionIndex = -1;

        for (let i = sections.length - 1; i >= 0; i--) {
            const section = sections[i];
            if (!section.element) continue;
            if (section.element.style.display === 'none') continue;

            const rect = section.element.getBoundingClientRect();
            const viewportCenter = window.innerHeight / 2;

            // Check if viewport center is within this section
            if (rect.top <= viewportCenter && rect.bottom >= viewportCenter) {
                activeSection = section.id;
                activeSectionIndex = i;
                break;
            }
        }

        // If no section detected at center, use the first visible section
        if (activeSection === null && lastVisibleIndex >= 0) {
            activeSection = sections[0].id;
            activeSectionIndex = 0;
        }

        // Update progress items
        progressItems.forEach(item => {
            const sectionId = item.getAttribute('data-section');
            const section = sections.find(s => s.id === sectionId);

            if (!section || !section.element) return;

            const sectionIndex = sections.findIndex(s => s.id === sectionId);

            // Hide progress item if section is not yet unlocked (display: none)
            if (section.element.style.display === 'none') {
                item.style.opacity = '0.3';
                item.style.pointerEvents = 'none';
                item.classList.remove('active', 'completed');
                return;
            } else {
                item.style.opacity = '1';
                item.style.pointerEvents = 'auto';
            }

            // Mark as active, completed, or available
            if (sectionId === activeSection) {
                // This is the current section
                item.classList.add('active');
                item.classList.remove('completed');
            } else if (sectionIndex < activeSectionIndex) {
                // This section is before the active one - mark as completed
                item.classList.remove('active');
                item.classList.add('completed');
            } else {
                // This section is after the active one - just available
                item.classList.remove('active', 'completed');
            }
        });
    }

    // Update on scroll
    window.addEventListener('scroll', updateProgressBar);

    // Update when sections become visible
    const observer = new MutationObserver(updateProgressBar);
    const config = { attributes: true, attributeFilter: ['style'], subtree: true };
    observer.observe(document.body, config);

    // Initial update
    updateProgressBar();
});
