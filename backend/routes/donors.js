const express = require('express');
const router = express.Router();
const admin = require('../firebase/admin');

// Mock donors storage when Firebase not available
const mockDonors = new Map();

// Register a new donor
router.post('/register', async (req, res) => {
  try {
    if (!admin) {
      // Mock donor registration
      const donorId = require('crypto').randomUUID();
      const donorData = { ...req.body, createdAt: new Date() };
      mockDonors.set(donorId, donorData);
      return res.status(201).json({ id: donorId, ...donorData });
    }

    const db = admin.firestore();
    const donorId = require('crypto').randomUUID();
    const donorData = { ...req.body, createdAt: admin.firestore.FieldValue.serverTimestamp() };
    await db.collection('donors').doc(donorId).set(donorData);
    res.status(201).json({ id: donorId, ...donorData });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get donor profile by ID
router.get('/profile/:id', async (req, res) => {
  try {
    if (!admin) {
      // Mock donor profile
      const donor = mockDonors.get(req.params.id);
      if (!donor) {
        return res.status(404).json({ message: 'Donor not found' });
      }
      return res.json({ id: req.params.id, ...donor });
    }

    const db = admin.firestore();
    const donorDoc = await db.collection('donors').doc(req.params.id).get();
    if (!donorDoc.exists) {
      return res.status(404).json({ message: 'Donor not found' });
    }
    const donor = { id: donorDoc.id, ...donorDoc.data() };
    // Populate connections, followers, following if needed
    // For simplicity, assuming they are stored as arrays of IDs
    res.json(donor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update donor profile
router.put('/profile/:id', async (req, res) => {
  try {
    const { name, username, bio, profilePhoto } = req.body;
    const updateData = { name, username, bio, profilePhoto, updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    await db.collection('donors').doc(req.params.id).update(updateData);
    const updatedDoc = await db.collection('donors').doc(req.params.id).get();
    if (!updatedDoc.exists) {
      return res.status(404).json({ message: 'Donor not found' });
    }
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Add connection (LinkedIn style follow)
router.post('/connect/:donorId/:targetId', async (req, res) => {
  try {
    const { donorId, targetId } = req.params;
    
    // Add targetId to donor's connections and following
    await db.collection('donors').doc(donorId).update({
      connections: admin.firestore.FieldValue.arrayUnion(targetId),
      following: admin.firestore.FieldValue.arrayUnion(targetId)
    });
    
    // Add donorId to target's followers
    await db.collection('donors').doc(targetId).update({
      followers: admin.firestore.FieldValue.arrayUnion(donorId)
    });
    
    res.json({ message: 'Connection established' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Remove connection
router.post('/disconnect/:donorId/:targetId', async (req, res) => {
  try {
    const { donorId, targetId } = req.params;
    
    // Remove targetId from donor's connections
    await db.collection('donors').doc(donorId).update({
      connections: admin.firestore.FieldValue.arrayRemove(targetId),
      following: admin.firestore.FieldValue.arrayRemove(targetId)
    });
    
    // Remove donorId from target's followers
    await db.collection('donors').doc(targetId).update({
      followers: admin.firestore.FieldValue.arrayRemove(donorId)
    });
    
    res.json({ message: 'Connection removed' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Add post
router.post('/posts/:donorId', async (req, res) => {
  try {
    const { title, description, image } = req.body;
    const postId = require('crypto').randomUUID();
    const postData = {
      postId,
      title,
      description,
      image,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    await db.collection('donors').doc(req.params.donorId).update({
      posts: admin.firestore.FieldValue.arrayUnion(postData)
    });
    res.json({ message: 'Post added', post: postData });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get post count for a donor
router.get('/posts/count/:donorId', async (req, res) => {
  try {
    const donorDoc = await db.collection('donors').doc(req.params.donorId).get();
    if (!donorDoc.exists) {
      return res.status(404).json({ message: 'Donor not found' });
    }
    const donorData = donorDoc.data();
    res.json({ 
      postCount: (donorData.posts || []).length,
      connectionCount: (donorData.connections || []).length,
      followerCount: (donorData.followers || []).length,
      followingCount: (donorData.following || []).length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Search donors
router.get('/search', async (req, res) => {
  try {
    const { bloodGroup, city } = req.query;
    let query = db.collection('donors');
    if (bloodGroup) query = query.where('bloodGroup', '==', bloodGroup);
    if (city) query = query.where('city', '==', city);
    const snapshot = await query.get();
    const donors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(donors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;