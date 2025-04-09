// 회원가입 폼 제출 처리
document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            // 비밀번호 확인
            if (password !== confirmPassword) {
                alert('비밀번호가 일치하지 않습니다.');
                return;
            }
            
            try {
                const response = await fetch('/api/auth/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name, email, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    alert('회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.');
                    window.location.href = '/login';
                } else {
                    alert(data.message || '회원가입에 실패했습니다.');
                }
            } catch (error) {
                console.error('회원가입 중 오류 발생:', error);
                alert('회원가입 중 오류가 발생했습니다.');
            }
        });
    }
    
    // 로그인 폼 제출 처리
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
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
                    // 로그인 성공
                    localStorage.setItem('token', data.token);
                    window.location.href = '/';
                } else {
                    // 로그인 실패
                    alert(data.message || '로그인에 실패했습니다.');
                }
            } catch (error) {
                console.error('로그인 중 오류 발생:', error);
                alert('로그인 중 오류가 발생했습니다.');
            }
        });
    }
});

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

// 인증 상태 UI 업데이트
function updateAuthUI(isAuthenticated, user = null) {
    const authLinks = document.getElementById('auth-links');
    if (!authLinks) return;
    
    if (isAuthenticated && user) {
        let adminLink = '';
        // 관리자인 경우 관리자 페이지 링크 추가
        if (user.role === 'admin') {
            adminLink = `
                <li class="nav-item">
                    <a class="nav-link" href="/admin">관리자 페이지</a>
                </li>
            `;
        }
        
        authLinks.innerHTML = `
            <li class="nav-item">
                <span class="nav-link">환영합니다, ${user.name}님!</span>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="/profile">프로필</a>
            </li>
            ${adminLink}
            <li class="nav-item">
                <a class="nav-link" href="#" onclick="logout()">로그아웃</a>
            </li>
        `;
    } else {
        authLinks.innerHTML = `
            <li class="nav-item">
                <a class="nav-link" href="/login">로그인</a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="/register">회원가입</a>
            </li>
        `;
    }
}

// 인증 상태 확인
async function checkAuthStatus() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        updateAuthUI(false);
        return false;
    }
    
    try {
        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('인증에 실패했습니다.');
        }
        
        const user = await response.json();
        updateAuthUI(true, user);
        return true;
    } catch (error) {
        console.error('Error:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        updateAuthUI(false);
        return false;
    }
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

// 로그인 처리
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
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
            updateAuthUI(true, data.user);
            window.router.navigate('/');
            showAlert('로그인되었습니다.', 'success');
        } else {
            showAlert(data.message || '로그인에 실패했습니다.', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('로그인 중 오류가 발생했습니다.', 'danger');
    }
}

// 회원가입 처리
async function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
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
}

// 로그아웃 처리
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateAuthUI(false);
    showAlert('로그아웃되었습니다.', 'success');
    router.navigate('/');
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

// 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', () => {
    // 인증 상태 확인
    checkAuthStatus();
    
    // 로그인 폼 이벤트 리스너
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // 회원가입 폼 이벤트 리스너
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', handleRegister);
    }
    
    // 로그아웃 버튼 이벤트 리스너
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
});

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