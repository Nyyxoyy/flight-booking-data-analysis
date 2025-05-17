const express = require('express');
const { processQuery } = require('./llmAgent');

const router = express.Router();

router.post('/query', async (req, res) => {
  try {
    if (!req.body.query || typeof req.body.query !== 'string') {
      return res.status(400).json({ error: 'Query must be a non-empty string' });
    }
    
    if (req.body.query.length > 500) {
      return res.status(400).json({ error: 'Query too long (max 500 chars)' });
    }

    const result = await processQuery(req.body.query);
    res.json(result);
  } catch (error) {
    console.error('Query processing error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
});

module.exports = router;