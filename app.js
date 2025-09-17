// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB3PxoSfFCnTEOfe1jtSO0z_sKkanh1iqg",
    authDomain: "redeacelerada-31f8d.firebaseapp.com",
    projectId: "redeacelerada-31f8d",
    storageBucket: "redeacelerada-31f8d.firebasestorage.app",
    messagingSenderId: "308912724721",
    appId: "1:308912724721:web:bad154d8292a773f6b6750",
    measurementId: "G-5VJZ06ZKS7"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// DOM elements
const authDiv = document.getElementById('auth');
const registerDiv = document.getElementById('register');
const dashboardDiv = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const showRegister = document.getElementById('showRegister');
const showLogin = document.getElementById('showLogin');
const logoutBtn = document.getElementById('logoutBtn');
const userNameSpan = document.getElementById('userName');
const inviteKeyDisplay = document.getElementById('inviteKeyDisplay');
const contactsDiv = document.getElementById('contacts');

// Auth state listener
auth.onAuthStateChanged(async (user) => {
    if (user) {
        authDiv.style.display = 'none';
        registerDiv.style.display = 'none';
        dashboardDiv.style.display = 'block';
        await loadDashboard(user);
    } else {
        authDiv.style.display = 'block';
        registerDiv.style.display = 'none';
        dashboardDiv.style.display = 'none';
    }
});

// Toggle forms
showRegister.addEventListener('click', (e) => {
    e.preventDefault();
    authDiv.style.display = 'none';
    registerDiv.style.display = 'block';
});

showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    registerDiv.style.display = 'none';
    authDiv.style.display = 'block';
});

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        alert('Erro no login: ' + error.message);
    }
});

// Register
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const phone = document.getElementById('phone').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const inviteKey = document.getElementById('inviteKey').value;

    try {
        // Validate invite key
        const parentDoc = await db.collection('users').where('invitationKey', '==', inviteKey).get();
        if (parentDoc.empty) {
            alert('Chave de convite inválida.');
            return;
        }
        const parentId = parentDoc.docs[0].id;
        const parentData = parentDoc.docs[0].data();
        const generation = parentData.generation + 1;

        // Create user
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const userId = userCredential.user.uid;

        // Generate invite key
        const newInviteKey = generateInviteKey();

        // Save to Firestore
        await db.collection('users').doc(userId).set({
            name,
            phone,
            email,
            parentId,
            invitationKey: newInviteKey,
            generation,
            children: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Update parent's children
        await db.collection('users').doc(parentId).update({
            children: firebase.firestore.FieldValue.arrayUnion(userId)
        });

        // If 5th gen or below, increment counter
        if (generation >= 5) {
            await incrementKeyCounter();
        }

    } catch (error) {
        alert('Erro no registro: ' + error.message);
    }
});

// Logout
logoutBtn.addEventListener('click', () => {
    auth.signOut();
});

// Load dashboard
async function loadDashboard(user) {
    const userDoc = await db.collection('users').doc(user.uid).get();
    const userData = userDoc.data();
    userNameSpan.textContent = userData.name;
    inviteKeyDisplay.textContent = userData.invitationKey;

    // Get unlocked contacts
    const unlockedContacts = await getUnlockedContacts(user.uid, userData);
    displayContacts(unlockedContacts);
}

// Generate invite key
function generateInviteKey() {
    return Math.random().toString(36).substr(2, 9).toUpperCase();
}

// Increment key counter for 5th gen+
async function incrementKeyCounter() {
    const counterRef = db.collection('counters').doc('keyCounter');
    await counterRef.update({
        count: firebase.firestore.FieldValue.increment(1)
    });
}

// Get unlocked contacts
async function getUnlockedContacts(userId, userData) {
    const generation = userData.generation;
    const childrenCount = userData.children.length;

    let unlocked = [];

    // 1st layer: all children
    if (userData.children.length > 0) {
        for (const childId of userData.children) {
            const childDoc = await db.collection('users').doc(childId).get();
            unlocked.push(childDoc.data());
        }
    }

    // 2nd layer: grandchildren if 10 children
    if (childrenCount >= 10) {
        for (const childId of userData.children) {
            const childDoc = await db.collection('users').doc(childId).get();
            const childData = childDoc.data();
            for (const grandchildId of childData.children) {
                const grandchildDoc = await db.collection('users').doc(grandchildId).get();
                unlocked.push(grandchildDoc.data());
            }
        }
    }

    // 3rd and 4th: similar logic, but simplified for now
    // For brevity, assuming similar checks

    // 5th+: every 4 keys
    if (generation >= 5) {
        const counterDoc = await db.collection('counters').doc('keyCounter').get();
        const count = counterDoc.exists ? counterDoc.data().count : 0;
        const unlockedCount = Math.floor(count / 4);
        // Get last unlockedCount users from 5th gen+
        // This is simplified; need better logic
        const recentUsers = await db.collection('users').where('generation', '>=', 5).orderBy('createdAt', 'desc').limit(unlockedCount).get();
        recentUsers.forEach(doc => unlocked.push(doc.data()));
    }

    return unlocked;
}

// Display contacts
function displayContacts(contacts) {
    contactsDiv.innerHTML = '';
    contacts.forEach(contact => {
        const div = document.createElement('div');
        div.innerHTML = `<p><strong>${contact.name}</strong><br>Telefone: ${contact.phone}<br>E-mail: ${contact.email}</p>`;
        contactsDiv.appendChild(div);
    });
}

// Register service worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js');
    });
}
