// Google Sheets API Integration
const SHEET_ID = '15SwhJnQK5Y9v8A6lpQ2Yxcb-rKwjVSDga5twy6DL7Os';
const API_URL = 'https://script.google.com/a/macros/sliqbydesign.com/s/AKfycbxt-qkBSPmGtBK1RB57DmSjNPbs6UgMDrJinr_l04XJ__oOLfNqq3wNs29V2v5qkc__ug/exec';

// Save submission to Google Sheets
async function saveToGoogleSheets(submissionData) {
    try {
        console.log('Attempting to save to Google Sheets:', submissionData);
        
        // Try direct call first
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'append',
                data: submissionData
            }),
            mode: 'no-cors' // This allows the call but we can't see the response
        });
        
        console.log('Google Sheets request sent (no-cors mode)');
        return true;
    } catch (error) {
        console.error('Error saving to Google Sheets:', error);
        // Fallback to localStorage
        const submissions = JSON.parse(localStorage.getItem('submissions') || '[]');
        submissions.push(submissionData);
        localStorage.setItem('submissions', JSON.stringify(submissions));
        return false;
    }
}

// Load submissions from Google Sheets
async function loadFromGoogleSheets() {
    try {
        console.log('Attempting to load from Google Sheets');
        
        // For loading, we need to handle CORS differently
        const response = await fetch(API_URL + '?action=get', {
            method: 'GET',
            mode: 'no-cors'
        });
        
        console.log('Google Sheets load request sent');
        
        // Since we can't read the response due to CORS, return localStorage data
        return JSON.parse(localStorage.getItem('submissions') || '[]');
    } catch (error) {
        console.error('Error loading from Google Sheets:', error);
        return JSON.parse(localStorage.getItem('submissions') || '[]');
    }
}
