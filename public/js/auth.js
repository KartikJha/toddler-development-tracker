let authToken = null;

function showAlert(msg, type = 'error') {
    // ...existing code...
}

function switchAuthMode(mode) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginTab = document.querySelector('.auth-tab:first-child');
    const registerTab = document.querySelector('.auth-tab:last-child');

    if (mode === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        loginTab.classList.remove('active');
        registerTab.classList.add('active');
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }

        authToken = data.token;
        localStorage.setItem('authToken', authToken);
        await onAuthSuccess(data.user);

    } catch (error) {
        showAlert(error.message, 'error');
    }
}

async function handleRegister(event) {
    event.preventDefault();
    
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const name = document.getElementById('parentName').value;
    const relationship = document.getElementById('relationship').value;

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email, 
                password,
                name,
                relationship
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }

        authToken = data.token;
        localStorage.setItem('authToken', authToken);
        await onAuthSuccess(data.user);

    } catch (error) {
        showAlert(error.message, 'error');
    }
}

async function updateParentInfo(info) {
    try {
        const response = await fetch('/api/parent', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(info)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to update parent info');
        }

        showAlert('Parent information updated successfully', 'success');
        return data.parent_info;

    } catch (error) {
        showAlert(error.message, 'error');
        throw error;
    }
}

async function updateAuthInfo(currentPassword, newPassword, email) {
    try {
        const response = await fetch('/api/auth', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword,
                email
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to update authentication info');
        }

        showAlert('Authentication information updated successfully', 'success');
        return data;

    } catch (error) {
        showAlert(error.message, 'error');
        throw error;
    }
}

function updateUIForAuthenticatedUser(user) {
    // Hide auth forms
    document.getElementById('auth').style.display = 'none';
    
    // Show main app content
    document.querySelector('.nav-tabs').style.display = 'flex';
    document.getElementById('profile').style.display = 'block';
    
    // Update header
    const header = document.querySelector('.header');
    header.innerHTML += `<p>Welcome, ${user.name || user.email}!</p>`;
}

async function verifyTokenAndLoad() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        showAuthView();
        return;
    }
    authToken = token;
    try {
        // Use a protected endpoint to verify token and fetch child/parent info
        const res = await fetch('/api/app', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!res.ok) throw new Error('Token invalid or expired');
        const data = await res.json();
        if (window.appData && data.child_info) {
            window.appData.child_info = data.child_info;
        }
        await onAuthSuccess(data.user || { email: data.child_info?.parent_info?.primary?.email });
    } catch (err) {
        localStorage.removeItem('authToken');
        authToken = null;
        showAuthView();
    }
}

async function onAuthSuccess(user) {
    // Hide auth, show nav-tabs and profile tab
    document.getElementById('auth').style.display = 'none';
    document.querySelector('.nav-tabs').style.display = 'flex';
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.getElementById('profile').style.display = 'block';
    // Optionally update header
    const header = document.querySelector('.header');
    if (header) header.innerHTML += `<p>Welcome, ${user?.name || user?.email || 'User'}!</p>`;
    // Make token available globally
    window.authToken = authToken;
    // Now initialize the app
    if (typeof window.initApp === 'function') {
        try { await window.initApp(); } catch (e) { console.error('initApp failed', e); }
    }
}

function showAuthView() {
    document.getElementById('auth').style.display = 'block';
    document.querySelector('.nav-tabs').style.display = 'none';
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    // Only show auth view on load, verify token if present
    showAuthView();
    verifyTokenAndLoad();
});