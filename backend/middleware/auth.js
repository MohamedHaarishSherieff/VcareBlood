const jwt = require('jsonwebtoken');
const admin = require('../firebase/admin');

module.exports = async function (req, res, next) {
  // Skip authentication if Firebase is not available
  if (!admin) {
    req.user = { id: 'guest', name: 'Guest User', role: 'guest' };
    return next();
  }

  const db = admin.firestore();
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ message: 'Missing token' });
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const userDoc = await db.collection('users').doc(payload.sub).get();
    if (!userDoc.exists) return res.status(401).json({ message: 'Invalid token' });
    const userData = userDoc.data();
    // Exclude sensitive fields
    delete userData.passwordHash;
    delete userData.refreshTokens;
    req.user = { id: userDoc.id, ...userData };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized', error: err.message });
  }
};
