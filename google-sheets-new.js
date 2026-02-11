// Google Sheets API Integration - Working Version
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbykpFD-LwYU_Osadg2u_fyFKKwCyRGmuT8ILxHqlq-uqgLdwgAuRrtiZjjNiYHwq-WhnA/exec';

// Save submission to Google Sheets
async function saveToGoogleSheets(submissionData) {
    try {
        console.log('NEW VERSION - Attempting to save to Google Sheets:', submissionData);
        
        // Simple approach: Create iframe and submit
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.name = 'googleSheetsFrame';
        
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = GOOGLE_SCRIPT_URL;
        form.target = 'googleSheetsFrame';
        
        // Add data as hidden field
        const dataField = document.createElement('input');
        dataField.type = 'hidden';
        dataField.name = 'data';
        dataField.value = JSON.stringify({
            action: 'append',
            data: submissionData
        });
        form.appendChild(dataField);
        
        // Submit the form
        document.body.appendChild(iframe);
        document.body.appendChild(form);
        form.submit();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(iframe);
            document.body.removeChild(form);
        }, 1000);
        
        console.log('NEW VERSION - Google Sheets form submitted via iframe');
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
        console.log('NEW VERSION - Attempting to load from Google Sheets via CSV export');
        
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
