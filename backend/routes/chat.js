const express = require('express');
const router = express.Router();
const knowledgeBaseService = require('../services/knowledgeBaseService');
const donorService = require('../services/donorService');

// POST /api/chat
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    let response;

    // Check if it's a donor search query
    if (donorService.isDonorQuery(message)) {
      const { bloodGroup, location } = donorService.extractDonorQuery(message);

      if (bloodGroup) {
        try {
          const donors = await donorService.searchDonors(bloodGroup, location, location);

          if (donors.length > 0) {
            response = `I found ${donors.length} donor(s) matching your request:\n\n${donors.map(d =>
              `• ${d.name} (${d.bloodGroup}) - ${d.city}, ${d.state} - ${d.phoneNumber}`
            ).join('\n')}`;
          } else {
            response = `Sorry, I couldn't find any donors with ${bloodGroup} blood type${location ? ` in ${location}` : ''}. Please try broadening your search or check back later.`;
          }
        } catch (error) {
          console.warn('Donor search failed:', error.message);
          response = `I detected you want to find ${bloodGroup} donors${location ? ` in ${location}` : ''}, but I'm having trouble connecting to the database right now. Please try again later.`;
        }
      } else {
        response = "I couldn't identify the blood group in your request. Please specify a blood type like A+, B-, O+, etc.";
      }
    } else {
      // General question - use RAG
      try {
        response = await knowledgeBaseService.generateAnswer(message);
      } catch (error) {
        console.warn('RAG failed:', error.message);
        response = "I'm here to help with blood donation information. How can I assist you today?";
      }
    }

    res.json({ response });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'Sorry, I encountered an error processing your message. Please try again.'
    });
  }
});

module.exports = router;