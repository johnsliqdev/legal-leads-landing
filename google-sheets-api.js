// Google Sheets API Integration
const SHEET_ID = '15SwhJnQK5Y9v8A6lpQ2Yxcb-rKwjVSDga5twy6DL7Os';
const API_URL = 'https://script.google.com/a/macros/sliqbydesign.com/s/AKfycbz_Iw-p83As7xlTi_Jho8X82VPMVzbmiQCqlNAMmuCLhMc3SXag4fSF3fydXuuK08TIUA/exec';

// Save submission to Google Sheets
async function saveToGoogleSheets(submissionData) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'append',
                data: submissionData
            }),
            mode: 'no-cors'
        });
        
        return true;
    } catch (error) {
        console.error('Error saving to Google Sheets:', error);
        // Fallback to localStorage
        localStorage.setItem('submissions', JSON.stringify(submissions));
        return false;
    }
}

// Load submissions from Google Sheets
async function loadFromGoogleSheets() {
    try {
        const response = await fetch(`${API_URL}?action=get`, {
            method: 'GET',
            mode: 'no-cors'
        });
        
        // For now, return localStorage data
        return JSON.parse(localStorage.getItem('submissions') || '[]');
    } catch (error) {
        console.error('Error loading from Google Sheets:', error);
        return JSON.parse(localStorage.getItem('submissions') || '[]');
    }
}
