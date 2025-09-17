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
const inviteDiv = document.getElementById('invite');
const registerDiv = document.getElementById('register');
const dashboardDiv = document.getElementById('dashboard');
const adminDashboardDiv = document.getElementById('adminDashboard');
const inviteForm = document.getElementById('inviteForm');
const registerForm = document.getElementById('registerForm');
const createUserForm = document.getElementById('createUserForm');
const logoutBtn = document.getElementById('logoutBtn');
const logoutBtnAdmin = document.getElementById('logoutBtnAdmin');
const userNameSpan = document.getElementById('userName');
const inviteKeyDisplay = document.getElementById('inviteKeyDisplay');
const contactsDiv = document.getElementById('contacts');
const generatedKeyDiv = document.getElementById('generatedKey');
const newInviteKeySpan = document.getElementById('newInviteKey');
const copyKeyBtn = document.getElementById('copyKeyBtn');
const userListDiv = document.getElementById('userList');

// Admin emails
const adminEmails = ['redeacelerada@gmail.com', 'eldergab@gmail.com'];

// Variables for invite
let validatedInviteKey = null;
let parentId = null;

// Auth state listener
auth.onAuthStateChanged(async (user) => {
    if (user) {
        if (adminEmails.includes(user.email)) {
            inviteDiv.style.display = 'none';
            registerDiv.style.display = 'none';
            dashboardDiv.style.display = 'none';
            adminDashboardDiv.style.display = 'block';
            await loadAdminDashboard();
        } else {
            inviteDiv.style.display = 'none';
            registerDiv.style.display = 'none';
            dashboardDiv.style.display = 'block';
            adminDashboardDiv.style.display = 'none';
            await loadDashboard(user);
        }
    } else {
        inviteDiv.style.display = 'block';
        registerDiv.style.display = 'none';
        dashboardDiv.style.display = 'none';
        adminDashboardDiv.style.display = 'none';
    }
});

// Invite form
inviteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const key = document.getElementById('inviteKeyInput').value.trim();
    try {
        const parentDoc = await db.collection('users').where('invitationKey', '==', key).get();
        if (parentDoc.empty) {
            alert('Chave de convite inválida.');
            return;
        }
        validatedInviteKey = key;
        parentId = parentDoc.docs[0].id;
        inviteDiv.style.display = 'none';
        registerDiv.style.display = 'block';
    } catch (error) {
        alert('Erro ao validar chave: ' + error.message);
    }
});

// Register
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const phone = document.getElementById('phone').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const parentData = (await db.collection('users').doc(parentId).get()).data();
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

        // Show dashboard
        // Auth state will handle

    } catch (error) {
        alert('Erro no registro: ' + error.message);
    }
});

// Logout
logoutBtn.addEventListener('click', () => {
    auth.signOut();
});

// Admin logout
logoutBtnAdmin.addEventListener('click', () => {
    auth.signOut();
});

// Create user by admin
createUserForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('adminName').value;
    const phone = document.getElementById('adminPhone').value;
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;

    try {
        // Create user
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const userId = userCredential.user.uid;

        // Generate invite key
        const newInviteKey = generateInviteKey();

        // Save to Firestore (admin created, no parent, generation 0)
        await db.collection('users').doc(userId).set({
            name,
            phone,
            email,
            parentId: null,
            invitationKey: newInviteKey,
            generation: 0,
            children: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Show generated key
        newInviteKeySpan.textContent = newInviteKey;
        generatedKeyDiv.style.display = 'block';

        // Clear form
        createUserForm.reset();

        // Reload user list
        await loadUserList();

    } catch (error) {
        alert('Erro ao criar usuário: ' + error.message);
    }
});

// Copy key
copyKeyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(newInviteKeySpan.textContent);
    alert('Chave copiada!');
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

// Load admin dashboard
async function loadAdminDashboard() {
    await loadUserList();
}

// Load user list
async function loadUserList() {
    const usersSnapshot = await db.collection('users').get();
    userListDiv.innerHTML = '';
    usersSnapshot.forEach(doc => {
        const user = doc.data();
        const div = document.createElement('div');
        div.innerHTML = `
            <p><strong>${user.name}</strong> (${user.email}) - Geração: ${user.generation} - Filhos: ${user.children.length}</p>
            <button onclick="editUser('${doc.id}')">Editar</button>
            <button onclick="deleteUser('${doc.id}')">Excluir</button>
        `;
        userListDiv.appendChild(div);
    });
}

// Edit user (placeholder)
function editUser(userId) {
    alert('Editar usuário: ' + userId);
    // Implement edit logic
}

// Delete user
async function deleteUser(userId) {
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
        try {
            await db.collection('users').doc(userId).delete();
            await loadUserList();
        } catch (error) {
            alert('Erro ao excluir: ' + error.message);
        }
    }
}

// Register service worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js');
    });
}
