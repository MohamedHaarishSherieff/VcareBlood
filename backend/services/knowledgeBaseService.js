const fs = require('fs');
const path = require('path');

class KnowledgeBaseService {
  constructor() {
    this.knowledgeBase = [];
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Load knowledge base from JSON
      const kbPath = path.join(__dirname, '../documents/knowledge_base.json');
      if (fs.existsSync(kbPath)) {
        const kbData = fs.readFileSync(kbPath, 'utf8');
        this.knowledgeBase = JSON.parse(kbData);
        console.log('Knowledge base loaded successfully with', this.knowledgeBase.length, 'entries');
      } else {
        console.warn('Knowledge base JSON not found, using fallback');
        this.knowledgeBase = [
          {
            question: "What is blood donation?",
            answer: "Blood donation is the process of giving blood to help save lives. Please consult a doctor for medical advice."
          }
        ];
      }

      this.initialized = true;
    } catch (error) {
      console.error('Error initializing knowledge base:', error);
      this.initialized = true; // Still mark as initialized to use fallback
    }
  }

  async generateAnswer(query) {
    if (!this.initialized) await this.initialize();

    try {
      // Check if query is related to app or blood donation
      if (!this.isRelatedQuery(query)) {
        return "I'm sorry, I can only assist with questions related to the V-Care app and blood donation. Please ask about app features, donor registration, or blood donation information.";
      }

      // Find best matching answer
      const bestMatch = this.findBestMatch(query);
      if (bestMatch) {
        return bestMatch.answer;
      } else {
        return "I'm here to help with V-Care app and blood donation questions. Could you please rephrase your question or ask about specific features like registration, donor search, or blood donation eligibility?";
      }
    } catch (error) {
      console.error('Knowledge base search error:', error);
      return "I'm having trouble processing your question. Please try again or ask about V-Care app features or blood donation.";
    }
  }

  isRelatedQuery(query) {
    const lowerQuery = query.toLowerCase();
    const relatedKeywords = [
      'app', 'v-care', 'vcare', 'register', 'donor', 'search', 'blood', 'donation', 'donate',
      'profile', 'chat', 'ai', 'post', 'refer', 'faq', 'settings', 'theme', 'language',
      'eligible', 'requirements', 'process', 'types', 'groups', 'age', 'weight', 'health',
      'frequency', 'compatibility', 'universal', 'safe', 'benefits', 'side effects'
    ];

    return relatedKeywords.some(keyword => lowerQuery.includes(keyword));
  }

  findBestMatch(query) {
    const lowerQuery = query.toLowerCase();
    const queryWords = lowerQuery.split(/\s+/).filter(word => word.length > 2);

    let bestMatch = null;
    let bestScore = 0;

    for (const entry of this.knowledgeBase) {
      const entryWords = entry.question.toLowerCase().split(/\s+/).filter(word => word.length > 2);
      let score = 0;

      // Count matching words
      for (const qWord of queryWords) {
        if (entryWords.includes(qWord)) score++;
      }

      // Bonus for exact phrase matches
      if (entry.question.toLowerCase().includes(lowerQuery)) score += 10;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = entry;
      }
    }

    // Only return if score is reasonable (at least 1 match or high score)
    return bestScore >= 1 ? bestMatch : null;
  }
}

module.exports = new KnowledgeBaseService();