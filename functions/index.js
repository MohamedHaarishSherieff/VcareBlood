/**
 * Firebase Cloud Functions for VCare Blood Donation App
 *
 * These functions replace the Express.js backend and run 24/7 on Firebase.
 * Each API endpoint becomes a separate Cloud Function.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

admin.initializeApp();

// JWT Secrets (use environment variables in production)
const JWT_SECRET = process.env.JWT_SECRET || 'vcare-secret-key-2024-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'vcare-refresh-secret-2024-change-in-production';

// ===== DONOR FUNCTIONS =====

// Register a new donor
exports.registerDonor = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const db = admin.firestore();
    const donorId = crypto.randomUUID();
    const donorData = {
      ...req.body,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('donors').doc(donorId).set(donorData);
    res.status(201).json({ id: donorId, ...donorData });
  } catch (error) {
    console.error('Error registering donor:', error);
    res.status(400).json({ message: error.message });
  }
});

// Get donor profile
exports.getDonorProfile = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const db = admin.firestore();
    const donorId = req.query.id || req.params.id;

    if (!donorId) {
      return res.status(400).json({ message: 'Donor ID required' });
    }

    const donorDoc = await db.collection('donors').doc(donorId).get();

    if (!donorDoc.exists) {
      return res.status(404).json({ message: 'Donor not found' });
    }

    const donor = { id: donorDoc.id, ...donorDoc.data() };
    res.json(donor);
  } catch (error) {
    console.error('Error getting donor profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ===== AUTH FUNCTIONS =====

// Register user
exports.registerUser = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { name, email, password, bloodGroup, city, state } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const db = admin.firestore();

    // Check if user exists
    const existingUser = await db.collection('users').where('email', '==', email).get();
    if (!existingUser.empty) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name
    });

    // Store additional user data in Firestore
    const userData = {
      name,
      email,
      bloodGroup,
      city,
      state,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('users').doc(userRecord.uid).set(userData);

    // Generate JWT tokens
    const accessToken = jwt.sign(
      { sub: userRecord.uid },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { sub: userRecord.uid },
      JWT_REFRESH_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        id: userRecord.uid,
        name,
        email,
        bloodGroup,
        city,
        state
      }
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(400).json({ message: error.message });
  }
});

// ===== CLEANUP FUNCTION (existing) =====

const DAYS = 10;
const CHAT_RETENTION_HOURS = 24;
const BATCH_SIZE = 500; // adjust as needed

// Initialize Firestore database
const db = admin.firestore();

async function deleteOldPostsOnce() {
  const cutoffMillis = Date.now() - DAYS * 24 * 60 * 60 * 1000;
  const cutoffTs = admin.firestore.Timestamp.fromMillis(cutoffMillis);
  
  console.log('=== Starting cleanup process ===');
  console.log(`Posts cutoff: ${new Date(cutoffMillis).toISOString()} (${DAYS} days ago)`);
  console.log(`Chat cutoff: ${new Date(Date.now() - CHAT_RETENTION_HOURS * 60 * 60 * 1000).toISOString()} (${CHAT_RETENTION_HOURS} hours ago)`);
  try {
    let query = db.collection('posts').where('createdAt', '<=', cutoffTs).limit(BATCH_SIZE);
    let removed = 0;
    do {
      const snap = await query.get();
      if (snap.empty) break;
      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      removed += snap.size;
      // continue until none left
      query = db.collection('posts').where('createdAt', '<=', cutoffTs).limit(BATCH_SIZE);
    } while (true);
    console.log(`Deleted ${removed} documents from 'posts' collection.`);
  } catch (err) {
    console.error('Error deleting top-level posts:', err);
  }

  // 1b) Delete old messages
  try {
    let msgQuery = db.collection('messages').where('createdAt', '<=', cutoffTs).limit(BATCH_SIZE);
    let msgRemoved = 0;
    do {
      const snap = await msgQuery.get();
      if (snap.empty) break;
      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      msgRemoved += snap.size;
      msgQuery = db.collection('messages').where('createdAt', '<=', cutoffTs).limit(BATCH_SIZE);
    } while (true);
    console.log(`Deleted ${msgRemoved} documents from 'messages' collection.`);
  } catch (err) {
    console.error('Error deleting old messages:', err);
  }

  // 1c) Delete old notifications
  try {
    let notifQuery = db.collection('notifications').where('createdAt', '<=', cutoffTs).limit(BATCH_SIZE);
    let notifRemoved = 0;
    do {
      const snap = await notifQuery.get();
      if (snap.empty) break;
      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      notifRemoved += snap.size;
      notifQuery = db.collection('notifications').where('createdAt', '<=', cutoffTs).limit(BATCH_SIZE);
    } while (true);
    console.log(`Deleted ${notifRemoved} documents from 'notifications' collection.`);
  } catch (err) {
    console.error('Error deleting old notifications:', err);
  }

  // 1d) Delete old chat messages older than 24 hours
  try {
    const chatCutoffMillis = Date.now() - CHAT_RETENTION_HOURS * 60 * 60 * 1000;
    const chatCutoffTs = admin.firestore.Timestamp.fromMillis(chatCutoffMillis);
    
    console.log(`Starting chat message cleanup. Cutoff: ${new Date(chatCutoffMillis).toISOString()}`);

    let chatQuery = db.collection('chats').where('createdAt', '<=', chatCutoffTs).limit(BATCH_SIZE);
    let chatRemoved = 0;
    do {
      const snap = await chatQuery.get();
      if (snap.empty) break;
      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      chatRemoved += snap.size;
      console.log(`Deleted batch of ${snap.size} chat messages. Total: ${chatRemoved}`);
      chatQuery = db.collection('chats').where('createdAt', '<=', chatCutoffTs).limit(BATCH_SIZE);
    } while (true);
    console.log(`✓ Successfully deleted ${chatRemoved} documents from 'chats' collection.`);
  } catch (err) {
    console.error('✗ Error deleting old chat messages:', err.message);
    console.error('  This may be due to missing Firestore indexes. Check Firebase Console > Firestore > Indexes.');
    console.error('  Required index: Collection=chats, Field=createdAt (Ascending/Descending)');
  }

  // 1e) Delete old conversation threads older than 24 hours
  try {
    const chatCutoffMillis = Date.now() - CHAT_RETENTION_HOURS * 60 * 60 * 1000;
    
    console.log(`Starting conversation cleanup. Cutoff: ${new Date(chatCutoffMillis).toISOString()}`);

    let conversationQuery = db.collection('conversations').where('lastMessageTimestamp', '<=', chatCutoffMillis).limit(BATCH_SIZE);
    let convRemoved = 0;
    do {
      const snap = await conversationQuery.get();
      if (snap.empty) break;
      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      convRemoved += snap.size;
      console.log(`Deleted batch of ${snap.size} conversations. Total: ${convRemoved}`);
      conversationQuery = db.collection('conversations').where('lastMessageTimestamp', '<=', chatCutoffMillis).limit(BATCH_SIZE);
    } while (true);
    console.log(`✓ Successfully deleted ${convRemoved} documents from 'conversations' collection.`);
  } catch (err) {
    console.error('✗ Error deleting old conversations:', err.message);
    console.error('  This may be due to missing Firestore indexes. Check Firebase Console > Firestore > Indexes.');
    console.error('  Required index: Collection=conversations, Field=lastMessageTimestamp (Ascending/Descending)');
  }

  // 2) Clean posts arrays inside `donors` documents
  try {
    const donorsSnap = await db.collection('donors').get();
    let updates = 0;
    for (const d of donorsSnap.docs) {
      const data = d.data() || {};
      const posts = Array.isArray(data.posts) ? data.posts : [];
      if (posts.length === 0) continue;

      const filtered = posts.filter((p) => {
        // support Firestore Timestamp or ISO string or millis
        if (!p || !p.createdAt) return true; // keep if no timestamp
        let t = null;
        if (p.createdAt.toMillis) t = p.createdAt.toMillis();
        else if (typeof p.createdAt === 'number') t = p.createdAt;
        else if (typeof p.createdAt === 'string') t = Date.parse(p.createdAt);
        else t = null;
        return !(t && t <= cutoffMillis); // keep if not older
      });

      if (filtered.length !== posts.length) {
        await d.ref.update({ posts: filtered });
        updates++;
      }
    }
    console.log(`Cleaned posts arrays in ${updates} donor documents.`);
  } catch (err) {
    console.error('Error cleaning donor posts arrays:', err);
  }
}

// Scheduled cleanup using Cloud Scheduler (via pubsub)
// Note: Scheduled functions require Cloud Pub/Sub API enabled
try {
  exports.scheduledDeleteOldPosts = functions.pubsub
    .schedule('every 24 hours')
    .timeZone('UTC')
    .onRun(async (context) => {
      console.log(`Running scheduledDeleteOldPosts at ${new Date().toISOString()}`);
      await deleteOldPostsOnce();
      return null;
    });
} catch (e) {
  console.log('Scheduled function not available, skipping scheduledDeleteOldPosts');
}

// Also export the function for manual testing via `node` or emulator
exports.deleteOldPostsOnce = deleteOldPostsOnce;

// Manual trigger function - can be called via Firebase Console or HTTP request
exports.manualDeleteOldPosts = functions.https.onCall(async (data, context) => {
  console.log('Manual cleanup triggered by:', context.auth ? context.auth.uid : 'anonymous');
  
  try {
    await deleteOldPostsOnce();
    return { 
      success: true, 
      message: 'Cleanup completed successfully. Check function logs for details.' 
    };
  } catch (error) {
    console.error('Manual cleanup failed:', error);
    throw new functions.https.HttpsError('internal', 'Cleanup failed', error.message);
  }
});

// HTTP trigger version for testing (no authentication required - use with caution)
exports.testDeleteOldPosts = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  console.log('Test cleanup triggered via HTTP');
  
  try {
    await deleteOldPostsOnce();
    res.json({ 
      success: true, 
      message: 'Test cleanup completed. Check function logs for details.' 
    });
  } catch (error) {
    console.error('Test cleanup failed:', error);
    res.status(500).json({ error: 'Cleanup failed', details: error.message });
  }
});
