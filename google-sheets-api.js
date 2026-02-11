// Google Sheets API Integration
const SHEET_ID = '15SwhJnQK5Y9v8A6lpQ2Yxcb-rKwjVSDga5twy6DL7Os';
const API_URL = 'https://script.google.com/macros/s/AKfycbxvfvqhMcjZSv1DFmY9TEad-Wwi7IywNKPpj5mEi3ayqwcp-Ja--ppAi_ZQFh3900JmCA/exec';

// Save submission to Google Sheets
async function saveToGoogleSheets(submissionData) {
    try {
        console.log('Attempting to save to Google Sheets:', submissionData);
        
        // Use no-cors mode to bypass CORS restrictions
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
        
        console.log('Google Sheets request sent (no-cors mode)');
        
        // With no-cors, we can't read the response, but the request should go through
        // Check Google Apps Script executions to see if it worked
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

// Load submissions from Google Sheets via public CSV export
async function loadFromGoogleSheets() {
    try {
        console.log('Attempting to load from Google Sheets via CSV export');
        
        // Use Google Sheets public CSV export (no CORS issues)
        const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/pub?output=csv&gid=0`;
        
        console.log('CSV URL:', csvUrl);
        
        const response = await fetch(csvUrl);
        
        if (response.ok) {
            const csvText = await response.text();
            console.log('Google Sheets CSV loaded:', csvText.substring(0, 200));
            
            // Parse CSV to JSON
            const rows = csvText.split('\n').filter(row => row.trim());
            if (rows.length < 2) return []; // No data
            
            const headers = rows[0].split(',').map(h => h.trim().replace(/"/g, ''));
            const data = [];
            
            for (let i = 1; i < rows.length; i++) {
                const values = rows[i].split(',').map(v => v.trim().replace(/"/g, ''));
                if (values.length === headers.length) {
                    const row = {};
                    headers.forEach((header, index) => {
                        row[header] = values[index];
                    });
                    data.push(row);
                }
            }
            
            console.log('Parsed Google Sheets data:', data);
            return data;
        } else {
            console.error('Google Sheets CSV error:', response.status, response.statusText);
            return [];
        }
    } catch (error) {
        console.error('Error loading from Google Sheets:', error);
        return [];
    }
}
