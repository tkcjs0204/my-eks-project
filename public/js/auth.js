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
            const response = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('인증 실패');
            
            const userData = await response.json();
            this.isAuthenticated = true;
            this.user = userData;
            this.updateAuthUI();
            return true;
        } catch (error) {
            console.error('Auth check error:', error);
            this.logout(); // 에러 발생 시 로그아웃 처리
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

    handleLogin: async function(event) {
        event.preventDefault();
        const form = event.target;
        const email = form.querySelector('[name="email"]').value;
        const password = form.querySelector('[name="password"]').value;
        
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
                localStorage.setItem('user', JSON.stringify(data.user));
                this.isAuthenticated = true;
                this.user = data.user;
                this.updateAuthUI();
                window.router.navigate('/');
                showAlert('로그인되었습니다.', 'success');
            } else {
                showAlert(data.message || '로그인에 실패했습니다.', 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('로그인 중 오류가 발생했습니다.', 'danger');
        }
    },

    handleRegister: async function(event) {
        event.preventDefault();
        const form = event.target;
        
        const name = form.querySelector('[name="name"]').value;
        const email = form.querySelector('[name="email"]').value;
        const password = form.querySelector('[name="password"]').value;
        const confirmPassword = form.querySelector('[name="confirm-password"]').value;
        
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
                body: JSON.stringify({ name, email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showAlert('회원가입이 완료되었습니다. 로그인해주세요.', 'success');
                window.router.navigate('/login');
            } else {
                showAlert(data.message || '회원가입에 실패했습니다.', 'danger');
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
        }
    }
};

window.auth = auth;

// 로그인/회원가입 폼 이벤트 리스너는 app.js에서 관리하도록 이관

// API 요청 시 JWT 토큰 추가
function addAuthHeader(headers = {}) {
    const token = localStorage.getItem('token');
    if (token) {
        return {
            ...headers,
            'Authorization': `Bearer ${token}`
        };
    }
    return headers;
}

// 로그인 모달 표시
function showLoginForm() {
    const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
    loginModal.show();
}

// 회원가입 모달 표시
function showRegisterForm() {
    const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
    registerModal.show();
}

// 알림 표시
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
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

// 현재 로그인한 사용자 정보 가져오기
function getCurrentUser() {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return {
            id: payload.id,
            name: payload.name,
            email: payload.email
        };
    } catch (error) {
        console.error('Error parsing token:', error);
        return null;
    }
}

// 현재 로그인한 사용자 ID 가져오기
function getCurrentUserId() {
    const user = getCurrentUser();
    return user ? user.id : null;
} 