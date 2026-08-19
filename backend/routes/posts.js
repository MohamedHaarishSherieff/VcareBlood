const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../firebase/admin');

// Skip Firebase-dependent routes if not available
if (!admin) {
  console.warn('Firebase not available - posts routes will return mock responses');
}

// Create a post (protected)
router.post('/', auth, async (req, res) => {
  try {
    if (!admin) {
      // Mock post creation when Firebase not available
      const postId = require('crypto').randomUUID();
      const postData = {
        authorId: req.user.id,
        title: req.body.title || '',
        body: req.body.body || '',
        images: req.body.images || [],
        likesCount: 0,
        commentsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      return res.status(201).json({ id: postId, ...postData });
    }

    const db = admin.firestore();
    const { title, body, images } = req.body;
    const postId = require('crypto').randomUUID();
    const postData = {
      authorId: req.user._id,
      title: title || '',
      body: body || '',
      images: images || [],
      likesCount: 0,
      commentsCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    await db.collection('posts').doc(postId).set(postData);
    res.status(201).json({ id: postId, ...postData });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get posts, optional ?authorId=
router.get('/', async (req, res) => {
  try {
    let query = db.collection('posts').orderBy('createdAt', 'desc').limit(50);
    if (req.query.authorId) {
      query = query.where('authorId', '==', req.query.authorId);
    }
    const snapshot = await query.get();
    const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single post
router.get('/:id', async (req, res) => {
  try {
    const postDoc = await db.collection('posts').doc(req.params.id).get();
    if (!postDoc.exists) return res.status(404).json({ message: 'Post not found' });
    res.json({ id: postDoc.id, ...postDoc.data() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
