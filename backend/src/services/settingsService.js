/**
 * Settings Service
 * Stores all app settings in a single Firestore document: config/system
 * Each setting is a field on that document.
 */

const { firestoreB } = require('../config/firebaseProjectB');

const CONFIG_DOC = () => firestoreB.doc('config/system');

async function getSetting(key) {
  try {
    const doc = await CONFIG_DOC().get();
    if (!doc.exists) return null;
    const val = doc.data()[key];
    return val !== undefined ? val : null;
  } catch (error) {
    console.error(`Error fetching setting ${key}:`, error);
    throw error;
  }
}

async function setSetting(key, value, _description = null) {
  try {
    await CONFIG_DOC().set({ [key]: value, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (error) {
    console.error(`Error updating setting ${key}:`, error);
    throw error;
  }
}

module.exports = { getSetting, setSetting };
