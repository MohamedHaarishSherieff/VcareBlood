const admin = require('firebase-admin');

// Initialize Firebase Admin SDK.
// Supports two modes:
// 1) FIREBASE_SERVICE_ACCOUNT env var containing the JSON string
// 2) GOOGLE_APPLICATION_CREDENTIALS environment variable pointing to the JSON file

function initFirebase() {
  if (admin.apps && admin.apps.length) return admin;

  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      let sa = process.env.FIREBASE_SERVICE_ACCOUNT;
      try {
        sa = JSON.parse(sa);
      } catch (e) {
        // if it's base64 encoded JSON, try to decode
        try {
          sa = JSON.parse(Buffer.from(sa, 'base64').toString('utf8'));
        } catch (e2) {
          console.warn('FIREBASE_SERVICE_ACCOUNT is not valid JSON, skipping Firebase initialization');
          return null;
        }
      }
      admin.initializeApp({
        credential: admin.credential.cert(sa)
      });
    } else {
      console.warn('FIREBASE_SERVICE_ACCOUNT not set, trying applicationDefault()');
      // applicationDefault() will use GOOGLE_APPLICATION_CREDENTIALS if present
      admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
    }
  } catch (error) {
    console.warn('Firebase initialization failed:', error.message);
    console.warn('Running without Firebase - some features may not work');
    return null;
  }

  return admin;
}

module.exports = initFirebase();
