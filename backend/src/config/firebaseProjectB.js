const admin = require('firebase-admin');
const path = require('path');

// Load the service account from the path specified in environment variables.
// Download this from: Firebase Console → capstone-31b9e → Project Settings
//                     → Service Accounts → Generate new private key.
// Place the file inside backend/ and set FIREBASE_B_CREDENTIAL_PATH to its path.
const credentialPath = process.env.FIREBASE_B_CREDENTIAL_PATH
  ? path.resolve(process.env.FIREBASE_B_CREDENTIAL_PATH)
  : null;

if (!credentialPath) {
  throw new Error(
    'FIREBASE_B_CREDENTIAL_PATH is not set. ' +
    'Download the service account JSON for capstone-31b9e and set the env var to its path.'
  );
}

const serviceAccount = require(credentialPath);

const projectBApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'capstone-31b9e',
}, 'projectB');

const authB      = projectBApp.auth();
const firestoreB = projectBApp.firestore();

/**
 * Verify a Firebase ID token sent from the frontend.
 * Returns the decoded token payload (includes uid, email, role custom claim, etc.)
 * Throws if the token is invalid or expired.
 *
 * @param {string} idToken  - Raw token from `Authorization: Bearer <token>` header
 * @returns {Promise<admin.auth.DecodedIdToken>}
 */
async function verifyIdToken(idToken) {
  return authB.verifyIdToken(idToken);
}

console.log('✅ Firebase Project B (capstone-31b9e) initialized');

module.exports = {
  authB,
  firestoreB,
  verifyIdToken,
};
