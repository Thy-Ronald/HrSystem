const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require('../../safedrain-b50e8-firebase-adminsdk-fbsvc-c2b87409f7.json');

// We use a separate app name to avoid conflict with default app (if any)
const projectAApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'safedrain-b50e8.firebasestorage.app'
}, 'projectA');

const firestoreA = projectAApp.firestore();
const storageA = projectAApp.storage();

console.log('✅ Firebase Project A (safedrain-b50e8) initialized');

module.exports = {
    firestoreA,
    storageA,
    adminA: admin // Exporting admin if needed for specific operations
};
