// Google Sheets API Integration via Proxy Server
const PROXY_URL = 'https://your-proxy-server-url.com'; // We'll update this after deployment

// Save submission to Google Sheets
async function saveToGoogleSheets(submissionData) {
    try {
        console.log('Attempting to save to Google Sheets via proxy:', submissionData);
        
        const response = await fetch(PROXY_URL + '/proxy/google-sheets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(submissionData)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('Google Sheets response via proxy:', result);
            return result.success;
        } else {
            console.error('Google Sheets error via proxy:', response.status, response.statusText);
            return false;
        }
    } catch (error) {
        console.error('Error saving to Google Sheets via proxy:', error);
        // Fallback to localStorage
        const submissions = JSON.parse(localStorage.getItem('submissions') || '[]');
        submissions.push(submissionData);
        localStorage.setItem('submissions', JSON.stringify(submissions));
        return false;
    }
}

// Load submissions from Google Sheets via Proxy Server
async function loadFromGoogleSheets() {
    try {
        console.log('Attempting to load from Google Sheets via proxy');
        
        const response = await fetch(PROXY_URL + '/proxy/google-sheets', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Google Sheets data loaded via proxy:', data);
            return data;
        } else {
            console.error('Google Sheets load error via proxy:', response.status, response.statusText);
            return [];
        }
    } catch (error) {
        console.error('Error loading from Google Sheets via proxy:', error);
        return [];
    }
}
