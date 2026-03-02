/**
 * One-time script: promote a user to admin role by email.
 * Usage: node src/scripts/promote_admin.js <email>
 */
require('dotenv').config();
const { firestoreB } = require('../config/firebaseProjectB');

async function promoteToAdmin(email) {
  const normalized = email.toLowerCase().trim();
  const snap = await firestoreB.collection('users')
    .where('email', '==', normalized)
    .limit(1)
    .get();

  if (snap.empty) {
    console.error(`No user found with email: ${normalized}`);
    console.log('\nAll users in Firestore:');
    const all = await firestoreB.collection('users').get();
    all.docs.forEach(d => console.log(' -', d.data().email, '|', d.data().name, '| role:', d.data().role));
    process.exit(1);
  }

  const doc = snap.docs[0];
  await doc.ref.update({ role: 'admin', updatedAt: new Date().toISOString() });
  console.log(`✅ Promoted ${doc.data().name} (${normalized}) to admin.`);
  process.exit(0);
}

const email = process.argv[2];
if (!email) {
  console.error('Usage: node src/scripts/promote_admin.js <email>');
  process.exit(1);
}

promoteToAdmin(email).catch(err => { console.error(err); process.exit(1); });
