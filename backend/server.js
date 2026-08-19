const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Basic security
app.use(helmet());
// Rate limiting for basic protection
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200 // limit each IP to 200 requests per windowMs
});
app.use(limiter);

app.use(cors());
app.use(express.json());

// initialize firebase admin
const admin = require('./firebase/admin');
if (admin) {
  console.log('Firebase admin initialized');
} else {
  console.warn('Firebase admin not initialized - donor search will not work');
}

// Initialize knowledge base
const knowledgeBaseService = require('./services/knowledgeBaseService');
knowledgeBaseService.initialize().catch(err => {
  console.error('Failed to initialize knowledge base:', err);
  console.warn('AI chat will use fallback responses');
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/donors'));
const usersRoutes = require('./routes/users');
const postsRoutes = require('./routes/posts');
const chatRoutes = require('./routes/chat');
app.use('/api/users', usersRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api', chatRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});