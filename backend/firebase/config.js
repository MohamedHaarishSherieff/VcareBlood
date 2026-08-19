const admin = require('./admin');

let db = null;
if (admin) {
  const { getFirestore } = require('firebase-admin/firestore');
  db = getFirestore();
}

module.exports = { db };