// Simple Express server for Replit deployment
// This proxies OpenRouter API calls to hide your API key

const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors()); // Allow requests from your frontend
app.use(express.json());

// Your OpenRouter API key - SET THIS AS AN ENVIRONMENT VARIABLE IN REPLIT!
const API_KEY = process.env.OPENROUTER_API_KEY ;

// API endpoint
app.post('/api/ai', async (req, res) => {
  try {
    const { model, prompt } = req.body;
    
    // Validate request
    if (!model || !prompt) {
      return res.status(400).json({ error: 'Missing model or prompt' });
    }

    // Call OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'API is running', endpoints: ['/api/ai'] });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
