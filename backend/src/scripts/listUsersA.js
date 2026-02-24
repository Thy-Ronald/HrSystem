const { firestoreA } = require('../config/firebaseProjectA');

async function listUsers() {
    console.log('Fetching users from Project A Firestore...');
    try {
        const usersRef = firestoreA.collection('users');
        const snapshot = await usersRef.get();

        if (snapshot.empty) {
            console.log('No users found in collection "users".');
            process.exit(0);
        }

        console.log(`Found ${snapshot.size} users:`);
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`- ID: ${doc.id}, Name: ${data.name || 'N/A'}, Email: ${data.email || 'N/A'}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to fetch users:', error.message);
        process.exit(1);
    }
}

listUsers();
