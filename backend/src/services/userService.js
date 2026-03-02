/**
 * User Service
 * Handles user operations via Firestore (capstone-31b9e / Project B)
 * User document path: users/{firebaseUid}
 */

const { authB, firestoreB } = require('../config/firebaseProjectB');

const USERS = () => firestoreB.collection('users');

/**
 * Create a Firestore user profile.
 * The Firebase Auth account must already exist before calling this.
 * @param {string} email
 * @param {*} _password  - ignored; Firebase Auth manages passwords
 * @param {string} name
 * @param {string} role
 * @param {Object} oauthData  - { firebase_uid (required), github_id, avatar_url }
 */
async function createUser(email, _password, name, role = 'employee', oauthData = {}) {
  const { firebase_uid, github_id = null, avatar_url = null } = oauthData;
  if (!firebase_uid) throw new Error('firebase_uid is required to create a user profile');

  const profile = {
    email:     email.toLowerCase().trim(),
    name:      name.trim(),
    role,
    githubId:  github_id,
    avatarUrl: avatar_url,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await USERS().doc(firebase_uid).set(profile, { merge: true });
  return { id: firebase_uid, ...profile };
}

/**
 * Find a user by email via Firebase Auth  Firestore.
 */
async function findUserByEmail(email) {
  try {
    const fbUser = await authB.getUserByEmail(email.toLowerCase().trim());
    return findUserByFirebaseUid(fbUser.uid);
  } catch (err) {
    if (err.code === 'auth/user-not-found') return null;
    throw err;
  }
}

/**
 * Find a user by GitHub ID.
 */
async function findUserByGithubId(githubId) {
  const snap = await USERS().where('githubId', '==', String(githubId)).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

/**
 * Find a user by their Firebase UID.
 */
async function findUserByFirebaseUid(uid) {
  const doc = await USERS().doc(uid).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

/**
 * Alias kept for backward compatibility  uid IS the user id now.
 */
async function findUserById(id) {
  return findUserByFirebaseUid(id);
}

/**
 * No-op in Firestore: uid IS the document key.
 * Kept only so auth.js (GitHub OAuth path) still compiles.
 */
async function linkFirebaseUid(_userId, _firebaseUid) {
  // Nothing to do  the Firestore doc key is already the Firebase UID.
}

/**
 * Search users by name prefix (requires a Firestore composite index on 'name').
 */
async function searchUsers(queryStr) {
  if (!queryStr) return [];
  const term = queryStr.trim();
  const snap = await USERS()
    .orderBy('name')
    .startAt(term)
    .endAt(term + '\uf8ff')
    .limit(20)
    .get();
  return snap.docs.map(doc => ({
    id:        doc.id,
    name:      doc.data().name,
    email:     doc.data().email,
    role:      doc.data().role,
    avatar_url: doc.data().avatarUrl,
  }));
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserByGithubId,
  findUserByFirebaseUid,
  linkFirebaseUid,
  findUserById,
  searchUsers,
};
