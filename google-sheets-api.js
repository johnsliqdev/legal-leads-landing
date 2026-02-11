// Google Sheets API Integration - Direct Approach
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbykpFD-LwYU_Osadg2u_fyFKKwCyRGmuT8ILxHqlq-uqgLdwgAuRrtiZjjNiYHwq-WhnA/exec';

// Save submission to Google Sheets
async function saveToGoogleSheets(submissionData) {
    try {
        console.log('Attempting to save to Google Sheets:', submissionData);
        
        // Use GET request with parameters to bypass CORS
        const data = {
            action: 'append',
            data: submissionData
        };
        
        const url = GOOGLE_SCRIPT_URL + '?data=' + encodeURIComponent(JSON.stringify(data));
        
        // Create a simple fetch with no-cors
        const response = await fetch(url, {
            method: 'GET',
            mode: 'no-cors'
        });
        
        console.log('Google Sheets request sent via GET');
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

// Load submissions from Google Sheets via CSV export
async function loadFromGoogleSheets() {
    try {
        console.log('Attempting to load from Google Sheets via CSV export');
        
        // Use Google Sheets public CSV export (no CORS issues)
        const csvUrl = 'https://docs.google.com/spreadsheets/d/15SwhJnQK5Y9v8A6lpQ2Yxcb-rKwjVSDga5twy6DL7Os/pub?output=csv&gid=0';
        
        const response = await fetch(csvUrl);
        
        if (response.ok) {
            const csvText = await response.text();
            console.log('Raw CSV text:', csvText);
            
            if (!csvText || csvText.trim() === '') {
                console.log('CSV is empty');
                return [];
            }
            
            // Parse CSV to JSON with better error handling
            const rows = csvText.split('\n').filter(row => row.trim() !== '');
            console.log('CSV rows:', rows);
            
            if (rows.length < 2) {
                console.log('No data rows found');
                return [];
            }
            
            const headers = rows[0].split(',').map(h => h.trim().replace(/"/g, ''));
            console.log('CSV headers:', headers);
            
            const data = [];
            
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.trim() === '') continue;
                
                const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
                console.log(`Row ${i} values:`, values);
                
                const rowData = {};
                headers.forEach((header, index) => {
                    rowData[header] = values[index] || '';
                });
                data.push(rowData);
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
