const admin = require('firebase-admin');
const path = require('path');

// Credential resolution order:
//  1. FIREBASE_B_CREDENTIAL_PATH — path to a service account JSON file (local dev)
//  2. FIREBASE_B_CREDENTIAL_JSON — full JSON string (Cloud Run / CI env var)
//  3. Application Default Credentials — automatic on Google Cloud (Cloud Run)
function resolveCredential() {
  if (process.env.FIREBASE_B_CREDENTIAL_PATH) {
    const filePath = path.resolve(process.env.FIREBASE_B_CREDENTIAL_PATH);
    return admin.credential.cert(require(filePath));
  }
  if (process.env.FIREBASE_B_CREDENTIAL_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_B_CREDENTIAL_JSON);
    return admin.credential.cert(serviceAccount);
  }
  // Fallback: Application Default Credentials (works on Cloud Run / GCE automatically)
  return admin.credential.applicationDefault();
}

const projectBApp = admin.initializeApp({
  credential: resolveCredential(),
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
