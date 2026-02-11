// Google Sheets API Integration
const SHEET_ID = '15SwhJnQK5Y9v8A6lpQ2Yxcb-rKwjVSDga5twy6DL7Os';
const API_URL = 'https://script.google.com/macros/s/AKfycbxVkVnmNHXXKV3dIFl0bChduaT_WAhJ1l0iaGDzXaT7IyLlFWm1y9rwTHAinsGMYuGVRg/exec';

// Save submission to Google Sheets
async function saveToGoogleSheets(submissionData) {
    try {
        console.log('Attempting to save to Google Sheets:', submissionData);
        
        // Simple POST request without preflight
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'append',
                data: submissionData
            })
        });
        
        console.log('Google Sheets response status:', response.status);
        
        if (response.ok) {
            const result = await response.json();
            console.log('Google Sheets response:', result);
            return result.success;
        } else {
            console.error('Google Sheets error:', response.status, response.statusText);
            return false;
        }
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
        
        const response = await fetch(API_URL + '?action=get', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Google Sheets data loaded:', data);
            return data;
        } else {
            console.error('Google Sheets load error:', response.status, response.statusText);
            return JSON.parse(localStorage.getItem('submissions') || '[]');
        }
    } catch (error) {
        console.error('Error loading from Google Sheets:', error);
        return JSON.parse(localStorage.getItem('submissions') || '[]');
    }
}
