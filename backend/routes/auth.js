const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const admin = require('../firebase/admin');

// Skip Firebase-dependent routes if not available
if (!admin) {
  console.warn('Firebase not available - auth routes will return mock responses');
}

// Mock database for when Firebase is not available
const mockUsers = new Map();

function hashTokenId(tokenId) {
  return crypto.createHash('sha256').update(tokenId).digest('hex');
}

function generateTokenPair(userId) {
  const accessToken = jwt.sign({ sub: userId }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '15m' });
  const tokenId = crypto.randomBytes(32).toString('hex');
  const refreshToken = jwt.sign({ sub: userId, tid: tokenId }, process.env.REFRESH_TOKEN_SECRET || 'fallback_refresh_secret', { expiresIn: '30d' });
  return { accessToken, refreshToken, tokenId };
}

// POST /api/auth/register
router.post('/register', [
  body('name').isLength({ min: 2 }).trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, password, username, phoneNumber, dateOfBirth, gender, bloodGroup, city, state, country, profilePhotoUrl, bio } = req.body;

  try {
    if (!admin) {
      // Mock registration when Firebase not available
      const userId = crypto.randomUUID();
      const { accessToken, refreshToken } = generateTokenPair(userId);
      mockUsers.set(userId, { name, email, password, bloodGroup, city, state });
      return res.status(201).json({ accessToken, refreshToken, user: { id: userId, name, email } });
    }

    const db = admin.firestore();
    // Check if user exists
    const existingSnap = await db.collection('users').where('email', '==', email).get();
    if (!existingSnap.empty) return res.status(409).json({ message: 'Email already in use' });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userId = crypto.randomUUID();
    const { accessToken, refreshToken, tokenId } = generateTokenPair(userId);
    const refreshTokens = [{ tokenIdHash: hashTokenId(tokenId) }];

    // Save to Firestore
    await db.collection('users').doc(userId).set({
      name,
      email,
      username: username || null,
      passwordHash,
      phoneNumber: phoneNumber || null,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      gender: gender || null,
      bloodGroup: bloodGroup || null,
      city: city || null,
      state: state || null,
      country: country || null,
      profilePhotoUrl: profilePhotoUrl || null,
      bio: bio || '',
      refreshTokens,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(201).json({ accessToken, refreshToken, user: { id: userId, name, email } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;

  try {
    if (!admin) {
      // Mock login when Firebase not available
      for (const [userId, userData] of mockUsers.entries()) {
        if (userData.email === email && userData.password === password) {
          const { accessToken, refreshToken } = generateTokenPair(userId);
          return res.json({ accessToken, refreshToken, user: { id: userId, name: userData.name, email: userData.email } });
        }
      }
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const db = admin.firestore();
    const userSnap = await db.collection('users').where('email', '==', email).get();
    if (userSnap.empty) return res.status(401).json({ message: 'Invalid credentials' });

    const userDoc = userSnap.docs[0];
    const userData = userDoc.data();
    const match = await bcrypt.compare(password, userData.passwordHash);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    // Generate tokens
    const { accessToken, refreshToken, tokenId } = generateTokenPair(userDoc.id);
    // Persist hashed token id
    const refreshTokens = userData.refreshTokens || [];
    refreshTokens.push({ tokenIdHash: hashTokenId(tokenId) });
    await db.collection('users').doc(userDoc.id).update({ refreshTokens });

    res.json({ accessToken, refreshToken, user: { id: userDoc.id, name: userData.name, email: userData.email } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: 'Missing refresh token' });

  try {
    if (!admin) {
      // Mock refresh when Firebase not available
      return res.status(401).json({ message: 'Token refresh not available without Firebase' });
    }

    const db = admin.firestore();
    const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET || 'fallback_refresh_secret');
    const userId = payload.sub;
    const tokenId = payload.tid;
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return res.status(401).json({ message: 'Invalid refresh token' });
    const userData = userDoc.data();
    const tokenHash = hashTokenId(tokenId);
    const refreshTokens = userData.refreshTokens || [];
    const found = refreshTokens.find(rt => rt.tokenIdHash === tokenHash);
    if (!found) return res.status(401).json({ message: 'Refresh token revoked' });

    // Rotate refresh token: remove old, add new
    const { accessToken, refreshToken: newRefreshToken, tokenId: newTokenId } = generateTokenPair(userId);
    // Remove old
    const updatedTokens = refreshTokens.filter(rt => rt.tokenIdHash !== tokenHash);
    updatedTokens.push({ tokenIdHash: hashTokenId(newTokenId) });
    await db.collection('users').doc(userId).update({ refreshTokens: updatedTokens });
    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired refresh token', error: err.message });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: 'Missing refresh token' });

  try {
    if (!admin) {
      // Mock logout when Firebase not available
      return res.json({ message: 'Logged out' });
    }

    const db = admin.firestore();
    const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET || 'fallback_refresh_secret');
    const userId = payload.sub;
    const tokenId = payload.tid;
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return res.status(200).json({ message: 'Logged out' });
    const userData = userDoc.data();
    const tokenHash = hashTokenId(tokenId);
    const refreshTokens = userData.refreshTokens || [];
    const updatedTokens = refreshTokens.filter(rt => rt.tokenIdHash !== tokenHash);
    await db.collection('users').doc(userId).update({ refreshTokens: updatedTokens });
    res.json({ message: 'Logged out' });
  } catch (err) {
    // Even if invalid, return success to avoid token probing
    res.json({ message: 'Logged out' });
  }
});

module.exports = router;
