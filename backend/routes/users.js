const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../firebase/admin');

// Skip Firebase-dependent routes if not available
if (!admin) {
  console.warn('Firebase not available - users routes will return mock responses');
}

// GET /api/users/me - get current user's profile
router.get('/me', auth, async (req, res) => {
  try {
    res.json(req.user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/users/:id - public profile
router.get('/:id', async (req, res) => {
  try {
    if (!admin) {
      // Mock user profile when Firebase not available
      return res.status(404).json({ message: 'User profiles not available without Firebase' });
    }

    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(req.params.id).get();
    if (!userDoc.exists) return res.status(404).json({ message: 'User not found' });
    const userData = userDoc.data();
    // Exclude sensitive fields
    delete userData.passwordHash;
    delete userData.refreshTokens;
    res.json({ id: userDoc.id, ...userData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/users/me - update current user's profile
router.put('/me', auth, async (req, res) => {
  try {
    const updates = req.body;
    // Disallow updating sensitive fields directly
    delete updates.passwordHash;
    delete updates.refreshTokens;
    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    await db.collection('users').doc(req.user.id).update(updates);
    const updatedDoc = await db.collection('users').doc(req.user.id).get();
    const userData = updatedDoc.data();
    delete userData.passwordHash;
    delete userData.refreshTokens;
    res.json({ id: updatedDoc.id, ...userData });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
