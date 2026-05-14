require('dotenv').config();
const https = require('https');

const apiKey = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.models) {
                console.log('Models supporting generateContent:');
                json.models
                    .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
                    .forEach(m => console.log(' -', m.name, '|', m.displayName));
            } else {
                console.log('Response:', JSON.stringify(json, null, 2).substring(0, 1000));
            }
        } catch(e) {
            console.log('Raw:', data.substring(0, 500));
        }
    });
}).on('error', err => console.error('Request error:', err.message));
