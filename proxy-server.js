// Simple Node.js proxy server to handle CORS for Google Apps Script
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Google Apps Script URL
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx61TEEZuZv8uBgQp_qobhD28QtC8y0C_wvavbZO3lDx6Cth8f5OdZh3oIxL7Jv8kGp0A/exec';

// Proxy endpoint to forward requests to Google Apps Script
app.post('/proxy/google-sheets', async (req, res) => {
    try {
        console.log('Proxy request received:', req.body);
        
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(req.body)
        });
        
        const result = await response.json();
        console.log('Google Sheets response:', result);
        
        res.json(result);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete endpoint to clear Google Sheets
app.delete('/proxy/google-sheets', async (req, res) => {
    try {
        console.log('Delete request received');
        
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'clear' })
        });
        
        const result = await response.json();
        console.log('Google Sheets cleared:', result);
        
        res.json(result);
    } catch (error) {
        console.error('Delete proxy error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get endpoint to load from Google Sheets
app.get('/proxy/google-sheets', async (req, res) => {
    try {
        console.log('Proxy load request received');
        
        const response = await fetch(GOOGLE_SCRIPT_URL + '?action=get', {
            method: 'GET'
        });
        
        const result = await response.json();
        console.log('Google Sheets data loaded:', result);
        
        res.json(result);
    } catch (error) {
        console.error('Proxy load error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Proxy server running on port ${PORT}`);
});
