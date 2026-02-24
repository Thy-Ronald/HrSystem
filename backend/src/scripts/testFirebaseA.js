const { firestoreA } = require('../config/firebaseProjectA');

async function testConnection() {
    console.log('Testing connection to Project A Firestore...');
    try {
        // Just try to get a reference to a collection (doesn't require network until .get())
        const testRef = firestoreA.collection('users').limit(1);
        console.log('✅ Successfully obtained reference to users collection');

        // Note: Actually fetching data might fail if no internet or invalid auth
        console.log('Attempting to fetch 1 document from users collection...');
        const snapshot = await testRef.get();
        console.log(`✅ Fetch successful. Found ${snapshot.size} documents.`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Firestore connection test failed:', error.message);
        process.exit(1);
    }
}

testConnection();
