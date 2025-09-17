// Script to create a test user with invite key "TESTE123" in Firestore
// Run this with Node.js and Firebase Admin SDK configured

const admin = require('firebase-admin');

const serviceAccount = require('./redeacelerada-31f8d-firebase-adminsdk-fbsvc-478990ee50.json'); // Adjusted path and filename

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function createTestUser() {
  const testUserId = 'testUserId123'; // arbitrary id
  const testUserData = {
    name: 'Usuário Teste',
    phone: '00000000000',
    email: 'teste@teste.com',
    parentId: null,
    invitationKey: 'TESTE123',
    generation: 0,
    children: [],
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };

  try {
    await db.collection('users').doc(testUserId).set(testUserData);
    console.log('Test user created successfully.');
  } catch (error) {
    console.error('Error creating test user:', error);
  }
}

createTestUser();
