const auth = {
    isAuthenticated: false,
    user: null,

    checkAuthStatus: async function() {
        const token = localStorage.getItem('token');
        if (!token) {
            this.isAuthenticated = false;
            this.user = null;
            this.updateAuthUI();
            return false;
        }

        try {
            const response = await fetch('/api/auth/status', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.isAuthenticated = data.isAuthenticated;
                this.user = data.user;
                this.updateAuthUI();
                return true;
            } else {
                this.isAuthenticated = false;
                this.user = null;
                localStorage.removeItem('token');
                this.updateAuthUI();
                return false;
            }
        } catch (error) {
            console.error('Auth status check failed:', error);
            this.isAuthenticated = false;
            this.user = null;
            localStorage.removeItem('token');
            this.updateAuthUI();
            return false;
        }
    },

    updateAuthUI: function() {
        const authButtons = document.getElementById('auth-buttons');
        if (!authButtons) return;

        if (this.isAuthenticated && this.user) {
            authButtons.innerHTML = `
                <span class="navbar-text me-3">
                    환영합니다, ${this.user.name}님!
                </span>
                <a href="/profile" class="btn btn-outline-light">프로필</a>
                <button onclick="auth.logout()" class="btn btn-light">로그아웃</button>
            `;
        } else {
            authButtons.innerHTML = `
                <button class="btn btn-outline-light" data-bs-toggle="modal" data-bs-target="#loginModal">로그인</button>
                <button class="btn btn-light" data-bs-toggle="modal" data-bs-target="#registerModal">회원가입</button>
            `;
        }
    },

    async handleLogin(event) {
        event.preventDefault();
        const form = event.target;
        const email = form.elements.loginEmail.value;
        const password = form.elements.loginPassword.value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                await this.checkAuthStatus();
                showAlert('로그인 성공!', 'success');
                const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
                loginModal.hide();
            } else {
                showAlert(data.message, 'danger');
            }
        } catch (error) {
            console.error('Login error:', error);
            showAlert('로그인 중 오류가 발생했습니다.', 'danger');
        }
    },

    async handleRegister(event) {
        event.preventDefault();
        const form = event.target;
        const name = form.elements.registerName.value;
        const username = form.elements.registerUsername.value;
        const email = form.elements.registerEmail.value;
        const password = form.elements.registerPassword.value;
        const confirmPassword = form.elements.registerConfirmPassword.value;

        if (password !== confirmPassword) {
            showAlert('비밀번호가 일치하지 않습니다.', 'danger');
            return;
        }

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, username, email, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                await this.checkAuthStatus();
                showAlert('회원가입 성공!', 'success');
                const registerModal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
                registerModal.hide();
            } else {
                showAlert(data.message, 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('회원가입 중 오류가 발생했습니다.', 'danger');
        }
    },
    
    logout: function() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.isAuthenticated = false;
        this.user = null;
        this.updateAuthUI();
        showAlert('로그아웃되었습니다.', 'success');
        if (window.router) {
            window.router.navigate('/');
        } else {
            window.location.href = '/';
        }
    },

    getCurrentUser() {
        return this.user;
    },

    updateUI(isAuthenticated, user) {
        this.isAuthenticated = isAuthenticated;
        this.user = user;
        this.updateAuthUI();
    },

    addAuthHeader(headers = {}) {
        const token = localStorage.getItem('token');
        if (token) {
            return {
                ...headers,
                'Authorization': `Bearer ${token}`
            };
        }
        return headers;
    }
};

window.auth = auth;

// 알림 표시 (전역 함수로 유지, 여러 곳에서 사용될 수 있음)
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) {
        console.error('Alert container not found!');
        return;
    }
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    alertContainer.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
} 