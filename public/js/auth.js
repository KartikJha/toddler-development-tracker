let authToken = null;

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
        updateUIForAuthenticatedUser(data.user);
        showTab('profile');

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
        updateUIForAuthenticatedUser(data.user);
        showTab('profile');

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

function checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    if (token) {
        authToken = token;
        // Verify token and update UI
        fetch('/api/app', {
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(response => {
            if (response.ok) {
                updateUIForAuthenticatedUser({ email: 'user@example.com' });
            } else {
                localStorage.removeItem('authToken');
                showAuth();
            }
        }).catch(() => {
            localStorage.removeItem('authToken');
            showAuth();
        });
    } else {
        showAuth();
    }
}

function showAuth() {
    document.getElementById('auth').style.display = 'block';
    document.querySelector('.nav-tabs').style.display = 'none';
    Array.from(document.getElementsByClassName('tab-content'))
        .forEach(el => el.style.display = 'none');
}

// Initialize auth
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    checkAuthStatus();
});