// 인증 관련 함수들
async function checkAuthStatus() {
    const token = localStorage.getItem('token');
    
    if (!token) {
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
        
        return true;
    } catch (error) {
        console.error('Error:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return false;
    }
}

// 라우터 초기화
window.router = {
    routes: {
        '/': home,
        '/login': loginPage,
        '/register': registerPage,
        '/blog': blogPage,
        '/blog/new': newBlogPostPage,
        '/blog/:id': blogDetailPage,
        '/blog/:id/edit': editBlogPostPage,
        '/projects': projectsPage,
        '/projects/new': newProjectPage,
        '/projects/:id': projectDetailPage,
        '/profile': profilePage,
        '/admin': adminPage
    },
    
    async navigate(path) {
        window.history.pushState({}, '', path);
        await this.handleRoute();
    },
    
    async handleRoute() {
        const path = window.location.pathname;
        console.log('Current path:', path);
        
        // 사용자 인증 상태 확인 및 업데이트
        try {
            const token = localStorage.getItem('token');
            if (token) {
                const userResponse = await fetch('/api/auth/me', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (userResponse.ok) {
                    const user = await userResponse.json();
                    localStorage.setItem('user', JSON.stringify(user));
                    updateAuthUI(true, user);
                } else {
                    // 토큰이 유효하지 않은 경우 로그아웃 처리
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    updateAuthUI(false);
                }
            } else {
                updateAuthUI(false);
            }
        } catch (error) {
            console.error('인증 상태 확인 오류:', error);
        }
        
        // 정확한 경로 매칭을 위해 정규식 수정
        const route = Object.keys(this.routes).find(route => {
            const routeRegex = new RegExp('^' + route.replace(/:[^/]+/g, '[^/]+') + '$');
            return routeRegex.test(path);
        });
        
        if (route) {
            const params = {};
            const routeParts = route.split('/');
            const pathParts = path.split('/');
            
            routeParts.forEach((part, index) => {
                if (part.startsWith(':')) {
                    params[part.slice(1)] = pathParts[index];
                }
            });
            
            try {
            await this.routes[route](params);
            } catch (error) {
                console.error('Route handling error:', error);
                showAlert('페이지를 로드하는 중 오류가 발생했습니다.', 'danger');
            }
        } else {
            console.log('Route not found:', path);
            // 404 페이지 표시
            const mainContent = document.querySelector('#main-content');
            if (mainContent) {
                mainContent.innerHTML = `
                    <div class="container mt-5">
                        <h1>404 - 페이지를 찾을 수 없습니다</h1>
                        <p>요청하신 페이지를 찾을 수 없습니다.</p>
                        <a href="/" class="btn btn-primary">홈으로 돌아가기</a>
                    </div>
                `;
            }
        }
    }
};

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 인증 상태 체크
        const isAuthenticated = await checkAuthStatus();
        if (isAuthenticated) {
            const user = JSON.parse(localStorage.getItem('user'));
            updateAuthUI(true, user);
        } else {
            updateAuthUI(false);
        }
        
        // 초기 페이지 로드
        window.router.handleRoute();
        
        // 브라우저 뒤로가기/앞으로가기 처리
        window.addEventListener('popstate', () => {
            window.router.handleRoute();
        });
    } catch (error) {
        console.error('Initialization error:', error);
    }
}); 

// 로그인 페이지
async function loginPage() {
    const mainContent = document.querySelector('#main-content');
    if (!mainContent) return;

    mainContent.innerHTML = `
        <div class="container mt-5">
            <div class="row justify-content-center">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-body">
                            <h2 class="card-title text-center mb-4">로그인</h2>
            <form id="login-form">
                                <div class="mb-3">
                                    <label for="email" class="form-label">이메일</label>
                                    <input type="email" class="form-control" id="email" name="email" required autocomplete="email">
                </div>
                                <div class="mb-3">
                                    <label for="password" class="form-label">비밀번호</label>
                                    <input type="password" class="form-control" id="password" name="password" required autocomplete="current-password">
                </div>
                                <button type="submit" class="btn btn-primary w-100">로그인</button>
            </form>
                            <div class="text-center mt-3">
                                <a href="/register">계정이 없으신가요? 회원가입</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 로그인 폼 이벤트 리스너
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            await login(email, password);
        });
    }
}

// 회원가입 페이지
async function registerPage() {
    const mainContent = document.querySelector('#main-content');
    if (!mainContent) return;

    mainContent.innerHTML = `
        <div class="container mt-5">
            <div class="row justify-content-center">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-body">
                            <h2 class="card-title text-center mb-4">회원가입</h2>
            <form id="register-form">
                                <div class="mb-3">
                                    <label for="username" class="form-label">사용자명</label>
                                    <input type="text" class="form-control" id="username" name="username" required autocomplete="username">
                </div>
                                <div class="mb-3">
                                    <label for="name" class="form-label">이름</label>
                                    <input type="text" class="form-control" id="name" name="name" required autocomplete="name">
                </div>
                                <div class="mb-3">
                                    <label for="email" class="form-label">이메일</label>
                                    <input type="email" class="form-control" id="email" name="email" required autocomplete="email">
                </div>
                                <div class="mb-3">
                                    <label for="password" class="form-label">비밀번호</label>
                                    <input type="password" class="form-control" id="password" name="password" required autocomplete="new-password">
                </div>
                                <div class="mb-3">
                                    <label for="confirm-password" class="form-label">비밀번호 확인</label>
                                    <input type="password" class="form-control" id="confirm-password" name="confirm-password" required autocomplete="new-password">
                                </div>
                                <button type="submit" class="btn btn-primary w-100">회원가입</button>
            </form>
                            <div class="text-center mt-3">
                                <a href="/login">이미 계정이 있으신가요? 로그인</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 회원가입 폼 이벤트 리스너
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const username = document.getElementById('username').value;
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (password !== confirmPassword) {
                    showAlert('비밀번호가 일치하지 않습니다.', 'danger');
                return;
            }

                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, name, email, password })
                });

                const data = await response.json();

                if (response.ok) {
                    showAlert('회원가입이 완료되었습니다. 로그인해주세요.', 'success');
                    window.router.navigate('/login');
                } else {
                    showAlert(data.message || '회원가입에 실패했습니다.', 'danger');
                }
            } catch (error) {
                console.error('Registration error:', error);
                showAlert('회원가입 중 오류가 발생했습니다.', 'danger');
            }
        });
    }
}

// 로그인 처리
async function login(email, password) {
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '로그인에 실패했습니다.');
        }
        
        const data = await response.json();
        
        // 토큰 저장
        localStorage.setItem('token', data.token);
        
        // 사용자 정보 가져오기
        try {
            const userResponse = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${data.token}`
                }
            });
            
            if (userResponse.ok) {
                const userData = await userResponse.json();
                localStorage.setItem('user', JSON.stringify(userData));
                console.log('Login successful, user data:', userData); // 디버깅용 로그
            } else {
                console.error('Failed to get user info after login:', userResponse.status);
            }
    } catch (error) {
            console.error('사용자 정보 로드 실패 after login:', error);
        }
        
        // UI 업데이트
        await updateAuthUI(true);
        
        // 로그인 모달 닫기
        const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
        if (loginModal) {
            loginModal.hide();
        }
        
        showAlert('로그인 성공!', 'success');
        
        // 현재 경로에 따라 추가 UI 업데이트
        const currentPath = window.location.pathname;
        
        // 블로그 게시글 상세 페이지인 경우 댓글 목록 새로고침
        if (currentPath.startsWith('/blog/')) {
            const postId = currentPath.split('/').pop();
            if (postId && !isNaN(postId)) {
                await loadComments(postId);
            }
        }
        
        // 홈페이지로 이동
        window.router.navigate('/');
    } catch (error) {
        console.error('Login error:', error);
        showAlert(error.message, 'danger');
    }
}

// 회원가입 처리
async function register(event) {
    event.preventDefault();
    
    const username = document.getElementById('username')?.value;
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
            body: JSON.stringify({ username, name, email, password })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '회원가입에 실패했습니다.');
        }
        
        const data = await response.json();
        
        // 회원가입 성공 후 로그인 모달 표시
        showAlert('회원가입이 완료되었습니다. 로그인해주세요.', 'success');
        
        // 회원가입 모달 닫기
        const registerModal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
        if (registerModal) {
            registerModal.hide();
        }
        
        // 로그인 모달 표시
        showLoginModal();
    } catch (error) {
        console.error('Error:', error);
        showAlert(error.message, 'danger');
    }
}

// 로그아웃 처리
async function logout() {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
            showToast('로그아웃 성공!', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            showToast('로그아웃에 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('로그아웃 중 오류가 발생했습니다.', 'error');
    }
}

// 인증 UI 업데이트
async function updateAuthUI(isAuthenticated = null, user = null) {
    // isAuthenticated가 null이면 현재 상태를 확인
    if (isAuthenticated === null) {
        const token = localStorage.getItem('token');
        isAuthenticated = !!token;
    }
    
    // user가 null이면 현재 사용자 정보를 가져옴
    if (user === null && isAuthenticated) {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const response = await fetch('/api/auth/me', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    user = await response.json();
                    // 사용자 정보를 로컬 스토리지에 업데이트
                    localStorage.setItem('user', JSON.stringify(user));
                } else {
                    console.error('Failed to get user info:', response.status);
                    // 토큰이 유효하지 않으면 삭제
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    isAuthenticated = false;
                }
            } catch (error) {
                console.error('사용자 정보 로드 실패:', error);
                // 오류가 발생해도 인증 상태는 유지 (토큰이 있으면 인증된 것으로 간주)
                // 대신 사용자 정보만 로컬 스토리지에서 가져옴
                const storedUser = localStorage.getItem('user');
                if (storedUser) {
                    try {
                        user = JSON.parse(storedUser);
                    } catch (parseError) {
                        console.error('사용자 정보 파싱 오류:', parseError);
                        localStorage.removeItem('user');
                    }
                }
            }
        }
    }
    
    // 사용자 정보가 없으면 로컬 스토리지에서 가져옴
    if (!user && isAuthenticated) {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                user = JSON.parse(storedUser);
            } catch (error) {
                console.error('사용자 정보 파싱 오류:', error);
                localStorage.removeItem('user');
                // 사용자 정보가 없어도 토큰이 있으면 인증된 것으로 간주
                // isAuthenticated = false;
            }
        }
    }
    
    // auth-buttons 컨테이너 가져오기
    const authButtonsContainer = document.getElementById('auth-buttons');
    if (!authButtonsContainer) {
        console.error('auth-buttons 컨테이너를 찾을 수 없습니다.');
        return;
    }
    
    // 컨테이너 초기화
    authButtonsContainer.innerHTML = '';
    
    if (isAuthenticated && user) {
        // 로그인된 경우
        const userDropdown = document.createElement('div');
        userDropdown.className = 'dropdown';
        
        // 사용자 이름과 드롭다운 토글 버튼
        const dropdownToggle = document.createElement('button');
        dropdownToggle.className = 'btn btn-light dropdown-toggle d-flex align-items-center';
        dropdownToggle.setAttribute('type', 'button');
        dropdownToggle.setAttribute('data-bs-toggle', 'dropdown');
        dropdownToggle.setAttribute('aria-expanded', 'false');
        
        // 사용자 아바타 아이콘
        const userIcon = document.createElement('i');
        userIcon.className = 'fas fa-user-circle me-2';
        userIcon.style.fontSize = '1.2rem';
        
        // 사용자 이름
        const userName = document.createElement('span');
        userName.className = 'me-2';
        userName.textContent = user.name;
        
        dropdownToggle.appendChild(userIcon);
        dropdownToggle.appendChild(userName);
        userDropdown.appendChild(dropdownToggle);
        
        // 드롭다운 메뉴
        const dropdownMenu = document.createElement('ul');
        dropdownMenu.className = 'dropdown-menu dropdown-menu-end';
        
        // 프로필 메뉴 아이템
        const profileItem = document.createElement('li');
        const profileLink = document.createElement('a');
        profileLink.className = 'dropdown-item';
        profileLink.href = '/profile';
        profileLink.innerHTML = '<i class="fas fa-user me-2"></i>프로필';
        profileItem.appendChild(profileLink);
        dropdownMenu.appendChild(profileItem);
        
        // 관리자 메뉴 아이템 (관리자인 경우에만)
        if (user.role === 'admin') {
            const adminItem = document.createElement('li');
            const adminLink = document.createElement('a');
            adminLink.className = 'dropdown-item';
            adminLink.href = '/admin';
            adminLink.innerHTML = '<i class="fas fa-cog me-2"></i>관리자';
            adminItem.appendChild(adminLink);
            dropdownMenu.appendChild(adminItem);
        }
        
        // 구분선
        const divider = document.createElement('li');
        divider.innerHTML = '<hr class="dropdown-divider">';
        dropdownMenu.appendChild(divider);
        
        // 로그아웃 메뉴 아이템
        const logoutItem = document.createElement('li');
        const logoutLink = document.createElement('a');
        logoutLink.className = 'dropdown-item text-danger';
        logoutLink.href = '#';
        logoutLink.innerHTML = '<i class="fas fa-sign-out-alt me-2"></i>로그아웃';
        logoutLink.onclick = (e) => {
            e.preventDefault();
            logout();
        };
        logoutItem.appendChild(logoutLink);
        dropdownMenu.appendChild(logoutItem);
        
        userDropdown.appendChild(dropdownMenu);
        authButtonsContainer.appendChild(userDropdown);
    } else {
        // 로그인되지 않은 경우
        // 로그인 버튼
        const loginBtn = document.createElement('a');
        loginBtn.href = '/login';
        loginBtn.className = 'btn btn-light me-2 px-3';
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>로그인';
        authButtonsContainer.appendChild(loginBtn);
        
        // 회원가입 버튼
        const registerBtn = document.createElement('a');
        registerBtn.href = '/register';
        registerBtn.className = 'btn btn-primary px-3';
        registerBtn.innerHTML = '<i class="fas fa-user-plus me-2"></i>회원가입';
        authButtonsContainer.appendChild(registerBtn);
    }
    
    // 현재 경로에 따라 추가 UI 업데이트
    const currentPath = window.location.pathname;
    
    // 블로그 게시글 상세 페이지인 경우 댓글 목록 새로고침
    if (currentPath.startsWith('/blog/')) {
        const postId = currentPath.split('/').pop();
        if (postId && !isNaN(postId)) {
            await loadComments(postId);
        }
    }
}

// 모달 표시 함수들
function showLoginModal() {
    const modalHtml = `
        <div class="modal fade" id="loginModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">로그인</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="login-form">
                            <div class="mb-3">
                                <label for="email" class="form-label">이메일</label>
                                <input type="email" class="form-control" id="email" name="email" required autocomplete="email">
                            </div>
                            <div class="mb-3">
                                <label for="password" class="form-label">비밀번호</label>
                                <input type="password" class="form-control" id="password" name="password" required autocomplete="current-password">
                            </div>
                            <button type="submit" class="btn btn-primary w-100">로그인</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('loginModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('loginModal'));
    modal.show();
    
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        await login(email, password);
    });
}

function showRegisterModal() {
    const modalHtml = `
        <div class="modal fade" id="registerModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">회원가입</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="register-form">
                            <div class="mb-3">
                                <label for="username" class="form-label">사용자명</label>
                                <input type="text" class="form-control" id="username" name="username" required autocomplete="username">
                            </div>
                            <div class="mb-3">
                                <label for="email" class="form-label">이메일</label>
                                <input type="email" class="form-control" id="email" name="email" required autocomplete="email">
                            </div>
                            <div class="mb-3">
                                <label for="password" class="form-label">비밀번호</label>
                                <input type="password" class="form-control" id="password" name="password" required autocomplete="new-password">
                            </div>
                            <div class="mb-3">
                                <label for="confirmPassword" class="form-label">비밀번호 확인</label>
                                <input type="password" class="form-control" id="confirmPassword" name="confirmPassword" required autocomplete="new-password">
                            </div>
                            <button type="submit" class="btn btn-primary w-100">회원가입</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('registerModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('registerModal'));
    modal.show();
    
    document.getElementById('register-form').addEventListener('submit', register);
}

// 유틸리티 함수들
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.insertBefore(alertDiv, mainContent.firstChild);
    } else {
        document.body.appendChild(alertDiv);
    }
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// 인증 헤더 생성
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    } : {
        'Content-Type': 'application/json'
    };
}

// 현재 로그인한 사용자 정보 가져오기
async function getCurrentUser() {
    try {
        // 토큰이 있으면 서버에서 사용자 정보를 가져옴
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('No token found, user is not authenticated');
            return null;
        }
        
        console.log('Attempting to get user info with token');
        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const userData = await response.json();
            // ID를 정수형으로 변환하여 저장
            if (userData && userData.id) {
                userData.id = parseInt(userData.id);
            }
            localStorage.setItem('user', JSON.stringify(userData));
            console.log('Updated user info from server:', userData);
            return userData;
        } else {
            console.error('Failed to get user info:', response.status, response.statusText);
            // 토큰이 유효하지 않으면 삭제
            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                return null;
            }
            
            // 서버 연결 실패 시 로컬 저장소에서 사용자 정보 확인
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                try {
                    const userData = JSON.parse(storedUser);
                    // ID를 정수형으로 변환
                    if (userData && userData.id) {
                        userData.id = parseInt(userData.id);
                    }
                    console.log('Using stored user info as fallback:', userData);
                    return userData;
                } catch (error) {
                    console.error('Failed to parse stored user data:', error);
                    localStorage.removeItem('user');
                }
            }
        }
    } catch (error) {
        console.error('Error during user info fetch:', error);
        
        // 네트워크 오류 등의 경우 로컬 스토리지에서 확인
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const userData = JSON.parse(storedUser);
                // ID를 정수형으로 변환
                if (userData && userData.id) {
                    userData.id = parseInt(userData.id);
                }
                console.log('Using stored user info due to network error:', userData);
                return userData;
            } catch (error) {
                console.error('Failed to parse stored user data:', error);
                localStorage.removeItem('user');
            }
        }
    }
    
    return null;
}

// 현재 로그인한 사용자 ID 가져오기
function getCurrentUserId() {
    const user = getCurrentUser();
    return user ? user.id : null;
}

// 메인 페이지
async function home() {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
        <div class="container mt-4">
            <div class="jumbotron text-center mb-5">
                <h1 class="display-4">Note4U에 오신 것을 환영합니다!</h1>
                <p class="lead">당신의 아이디어를 공유하고 다른 사람들과 소통하세요.</p>
                <hr class="my-4">
                <div class="d-flex justify-content-center gap-3">
                    <a href="/blog" class="btn btn-primary btn-lg">
                        <i class="fas fa-book"></i> 블로그 보기
                    </a>
                    <a href="/projects" class="btn btn-success btn-lg">
                        <i class="fas fa-project-diagram"></i> 프로젝트 보기
                    </a>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-8">
                    <div class="card shadow-sm">
                        <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                            <h2 class="h4 mb-0">최근 게시글</h2>
                            <a href="/blog" class="btn btn-light btn-sm">더 보기</a>
                        </div>
                        <div class="card-body">
                            <div id="recent-posts"></div>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card shadow-sm">
                        <div class="card-header bg-success text-white d-flex justify-content-between align-items-center">
                            <h2 class="h4 mb-0">최근 프로젝트</h2>
                            <a href="/projects" class="btn btn-light btn-sm">더 보기</a>
                        </div>
                        <div class="card-body">
                            <div id="recent-projects"></div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row mt-4">
                <div class="col-md-4">
                    <div class="card shadow-sm h-100">
                        <div class="card-body text-center">
                            <i class="fas fa-pen-fancy fa-3x text-primary mb-3"></i>
                            <h3 class="h5">블로그 작성</h3>
                            <p class="text-muted">당신의 생각과 경험을 공유하세요.</p>
                            <a href="/blog/new" class="btn btn-outline-primary">글쓰기</a>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card shadow-sm h-100">
                        <div class="card-body text-center">
                            <i class="fas fa-project-diagram fa-3x text-success mb-3"></i>
                            <h3 class="h5">프로젝트 등록</h3>
                            <p class="text-muted">새로운 프로젝트를 시작하세요.</p>
                            <a href="/projects/new" class="btn btn-outline-success">프로젝트 등록</a>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card shadow-sm h-100">
                        <div class="card-body text-center">
                            <i class="fas fa-users fa-3x text-info mb-3"></i>
                            <h3 class="h5">커뮤니티</h3>
                            <p class="text-muted">다른 사용자들과 소통하세요.</p>
                            <a href="/blog" class="btn btn-outline-info">커뮤니티 참여</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 최근 게시글과 프로젝트 로드
    await loadRecentPosts();
    await loadRecentProjects();
}

// 블로그 페이지
async function blogPage() {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
        <div class="container mt-4">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2>블로그</h2>
                <a href="/blog/new" class="btn btn-primary">
                    <i class="fas fa-plus me-2"></i>새 게시글
                </a>
            </div>
            <div id="blog-list"></div>
        </div>
    `;
    
    // blog.js의 loadPosts 함수 사용
    await loadPosts();
}

// 블로그 상세 페이지
async function blogDetailPage(params) {
    try {
        const postId = params.id;
        
        // 현재 사용자 정보를 항상 새로 가져옴
        let currentUser = await getCurrentUser();
        console.log('Current user in blogDetailPage:', currentUser);
        
        // 게시글 정보 가져오기 (인증 토큰 포함)
        const response = await fetch(`/api/blog/posts/${postId}`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                // 인증 오류인 경우 로그인 모달 표시
                showAlert('로그인이 필요합니다.', 'warning');
                showLoginModal();
        return;
            }
            throw new Error('게시글을 불러오는데 실패했습니다.');
        }
        
        const post = await response.json();
        console.log('Post data:', post);
        
        // 권한 확인 (ID를 정수형으로 변환하여 비교)
        const postAuthorId = parseInt(post.author_id);
        const currentUserId = currentUser ? parseInt(currentUser.id) : null;
        const isAdmin = currentUser && currentUser.role === 'admin';
        const canEdit = currentUserId && (postAuthorId === currentUserId || isAdmin);
        
        console.log('Permission check:', {
            postAuthorId,
            currentUserId,
            isAdmin,
            canEdit
        });
        
        // 게시글 상세 페이지 표시
        document.getElementById('main-content').innerHTML = `
            <div class="container mt-4">
                <div class="card">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h2 class="card-title">${post.title}</h2>
                            <div class="btn-group">
                                <button class="btn btn-secondary" onclick="window.router.navigate('/blog')">목록으로</button>
                                ${canEdit ? `
                                    <button class="btn btn-primary" onclick="window.router.navigate('/blog/${post.id}/edit')">수정</button>
                                    <button class="btn btn-danger" onclick="deletePost(${post.id})">삭제</button>
                                ` : ''}
                            </div>
                        </div>
                        <div class="mb-3">
                            <small class="text-muted">
                                작성자: ${post.author_name} | 
                                작성일: ${new Date(post.created_at).toLocaleString()} | 
                                조회수: ${post.view_count || 0} | 
                                좋아요: ${post.like_count || 0}
                            </small>
                        </div>
                        ${post.tags && post.tags.length > 0 ? `
                            <div class="mb-3">
                                ${post.tags.map(tag => `
                                    <span class="badge bg-secondary me-1">${tag}</span>
                                `).join('')}
                            </div>
                        ` : ''}
                        <div class="card-text mt-4" style="white-space: pre-wrap;">${post.content}</div>
                        
                        <!-- 댓글 섹션 -->
                        <div class="mt-5">
                            <h4>댓글</h4>
                            <div id="comments-section">
                                <!-- 댓글 작성 폼 -->
                                <form id="comment-form" class="mb-4" onsubmit="submitComment(event, ${post.id})">
                                    <div class="mb-3">
                                        <textarea class="form-control" name="content" rows="3" placeholder="댓글을 작성하세요..." required></textarea>
                                    </div>
                                    <button type="submit" class="btn btn-primary">댓글 작성</button>
                                </form>
                                
                                <!-- 댓글 목록 -->
                                <div id="comments-list"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 댓글 목록 로드
        await loadComments(postId);

    } catch (error) {
        console.error('Error:', error);
        showAlert('게시글을 불러오는데 실패했습니다.', 'danger');
    }
}

// 좋아요 토글
async function toggleLike(postId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showAlert('로그인이 필요합니다.', 'warning');
            showLoginModal();
            return;
        }
        
        const response = await fetch(`/api/blog/posts/${postId}/like`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                showAlert('로그인이 필요합니다.', 'warning');
                showLoginModal();
                return;
            }
            throw new Error('좋아요 처리에 실패했습니다.');
        }

        const data = await response.json();
        const likeCountElement = document.getElementById(`like-count-${postId}`);
        if (likeCountElement) {
            likeCountElement.textContent = data.likes;
        }
        
        // 좋아요 버튼 아이콘 업데이트
        const likeButton = document.querySelector(`button[onclick="toggleLike(${postId})"]`);
        if (likeButton) {
            const heartIcon = likeButton.querySelector('i');
            if (heartIcon) {
                heartIcon.classList.toggle('text-danger');
            }
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert(error.message, 'danger');
    }
}

function showLoginForm() {
    const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
        <div class="container mt-5">
            <div class="row justify-content-center">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-body">
                            <h2 class="card-title text-center mb-4">로그인</h2>
                            <form id="loginForm" onsubmit="handleLogin(event)">
                                <div class="mb-3">
                                    <label for="email" class="form-label">이메일</label>
                                    <input type="email" class="form-control" id="email" name="email" required autocomplete="email">
                </div>
                                <div class="mb-3">
                                    <label for="password" class="form-label">비밀번호</label>
                                    <input type="password" class="form-control" id="password" name="password" required autocomplete="current-password">
                                </div>
                                <button type="submit" class="btn btn-primary w-100">로그인</button>
                            </form>
                            <div class="text-center mt-3">
                                <a href="#" onclick="showRegisterForm()">계정이 없으신가요? 회원가입</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            </div>
        `;
}

function showRegisterForm() {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
        <div class="container mt-5">
            <div class="row justify-content-center">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-body">
                            <h2 class="card-title text-center mb-4">회원가입</h2>
                            <form id="registerForm" onsubmit="handleRegister(event)">
                                <div class="mb-3">
                                    <label for="name" class="form-label">이름</label>
                                    <input type="text" class="form-control" id="name" name="name" required autocomplete="name">
            </div>
                                <div class="mb-3">
                                    <label for="email" class="form-label">이메일</label>
                                    <input type="email" class="form-control" id="email" name="email" required autocomplete="email">
                                </div>
                                <div class="mb-3">
                                    <label for="password" class="form-label">비밀번호</label>
                                    <input type="password" class="form-control" id="password" name="password" required autocomplete="new-password">
                                </div>
                                <div class="mb-3">
                                    <label for="confirmPassword" class="form-label">비밀번호 확인</label>
                                    <input type="password" class="form-control" id="confirmPassword" name="confirmPassword" required autocomplete="new-password">
                                </div>
                                <button type="submit" class="btn btn-primary w-100">회원가입</button>
                            </form>
                            <div class="text-center mt-3">
                                <a href="#" onclick="showLoginForm()">이미 계정이 있으신가요? 로그인</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// 블로그 게시글 수정 페이지
async function editBlogPostPage(params) {
    const mainContent = document.getElementById('main-content');
    
    try {
        // 현재 사용자 정보를 항상 새로 가져옴
        const currentUser = await getCurrentUser();
        
        if (!currentUser) {
            showAlert('로그인이 필요합니다.', 'warning');
            window.router.navigate('/login');
            return;
        }

        const response = await fetch(`/api/blog/posts/${params.id}`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error('게시글을 불러오는데 실패했습니다.');
        }
        
        const post = await response.json();
        
        // 디버깅을 위한 로그 추가
        console.log('Edit permission check:', {
            postAuthorId: post.author_id,
            currentUserId: currentUser.id,
            userRole: currentUser.role
        });
        
        // 관리자이거나 게시글 작성자인 경우에만 수정 가능
        if (currentUser.role !== 'admin' && parseInt(currentUser.id) !== parseInt(post.author_id)) {
            showAlert('게시글을 수정할 권한이 없습니다.', 'warning');
            window.router.navigate(`/blog/${params.id}`);
            return;
        }
    
    mainContent.innerHTML = `
        <div class="container mt-4">
                <div class="card">
                    <div class="card-body">
                    <h2 class="card-title mb-4">게시글 수정</h2>
                    <form id="edit-post-form">
                        <div class="mb-3">
                            <label for="title" class="form-label">제목</label>
                            <input type="text" class="form-control" id="title" value="${post.title}" required>
                    </div>
                        <div class="mb-3">
                            <label for="content" class="form-label">내용</label>
                            <textarea class="form-control" id="content" rows="10" required style="white-space: pre-wrap;">${post.content}</textarea>
                </div>
                        <div class="mb-3">
                            <label for="tags" class="form-label">태그 (쉼표로 구분)</label>
                            <input type="text" class="form-control" id="tags" value="${post.tags ? post.tags.join(', ') : ''}" placeholder="예: 기술, 프로그래밍, 웹개발">
            </div>
                        <div class="d-flex justify-content-between">
                            <button type="button" class="btn btn-secondary" onclick="window.router.navigate('/blog/${params.id}')">취소</button>
                            <button type="submit" class="btn btn-primary">수정하기</button>
                    </div>
                    </form>
            </div>
        </div>
        </div>
    `;
    
        // 폼 제출 이벤트 리스너
        const form = document.getElementById('edit-post-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const title = document.getElementById('title').value;
            const content = document.getElementById('content').value;
            const tags = document.getElementById('tags').value.split(',').map(tag => tag.trim()).filter(tag => tag);
            
            try {
                const response = await fetch(`/api/blog/posts/${params.id}`, {
                    method: 'PUT',
                    headers: {
                        ...getAuthHeaders(),
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ title, content, tags })
                });
        
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || '게시글 수정에 실패했습니다.');
                }
                
                showAlert('게시글이 수정되었습니다.', 'success');
                window.router.navigate(`/blog/${params.id}`);
            } catch (error) {
                console.error('Error:', error);
                showAlert(error.message, 'danger');
            }
        });
    } catch (error) {
        console.error('Error:', error);
        showAlert(error.message, 'danger');
        window.router.navigate('/blog');
    }
}

// 게시글 작성/수정 폼 표시
async function showPostForm(post = null) {
    const mainContent = document.getElementById('main-content');
    const currentUser = getCurrentUser();
    
    if (!currentUser) {
        showAlert('로그인이 필요합니다.', 'warning');
        window.router.navigate('/login');
        return;
    }
        
    const isEdit = !!post;
    const title = isEdit ? post.title : '';
    const content = isEdit ? post.content : '';
    const tags = isEdit ? (post.tags ? post.tags.join(', ') : '') : '';
    const postId = isEdit ? post.id : '';
    
    mainContent.innerHTML = `
        <div class="container mt-4">
                    <div class="card">
                        <div class="card-body">
                    <h2 class="card-title mb-4">${isEdit ? '게시글 수정' : '새 게시글 작성'}</h2>
                    <form id="post-form">
                        <div class="mb-3">
                            <label for="title" class="form-label">제목</label>
                            <input type="text" class="form-control" id="title" value="${title}" required>
                        </div>
                        <div class="mb-3">
                            <label for="content" class="form-label">내용</label>
                            <textarea class="form-control" id="content" rows="10" required style="white-space: pre-wrap;">${content}</textarea>
                    </div>
                        <div class="mb-3">
                            <label for="tags" class="form-label">태그 (쉼표로 구분)</label>
                            <input type="text" class="form-control" id="tags" value="${tags}" placeholder="예: 기술, 프로그래밍, 웹개발">
                </div>
                        <div class="d-flex justify-content-between">
                            <button type="button" class="btn btn-secondary" onclick="window.router.navigate('${isEdit ? `/blog/${postId}` : '/blog'}')">취소</button>
                            <button type="submit" class="btn btn-primary">${isEdit ? '수정하기' : '작성하기'}</button>
                        </div>
                    </form>
                    </div>
                </div>
            </div>
    `;
    
    // 폼 제출 이벤트 리스너
    const form = document.getElementById('post-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const title = document.getElementById('title').value;
        const content = document.getElementById('content').value;
        const tags = document.getElementById('tags').value.split(',').map(tag => tag.trim()).filter(tag => tag);
        
        try {
            const url = isEdit ? `/api/blog/posts/${postId}` : '/api/blog/posts';
            const method = isEdit ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ title, content, tags })
            });
        
        if (!response.ok) {
                throw new Error(isEdit ? '게시글 수정에 실패했습니다.' : '게시글 작성에 실패했습니다.');
            }
            
            showAlert(isEdit ? '게시글이 수정되었습니다.' : '게시글이 작성되었습니다.', 'success');
            window.router.navigate(isEdit ? `/blog/${postId}` : '/blog');
    } catch (error) {
        console.error('Error:', error);
            showAlert(error.message, 'danger');
        }
    });
}

// 토스트 메시지 표시 함수
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // 3초 후 자동으로 제거
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// 토스트 컨테이너 생성 함수
function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    document.body.appendChild(container);
    return container;
}

// 댓글 목록 로드
async function loadComments(postId) {
    try {
        console.log('Loading comments for post ID:', postId);
        const response = await fetch(`/api/blog/posts/${postId}/comments`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load comments');
        }
        
        const comments = await response.json();
        console.log('Comments loaded:', comments);
        
        const commentsContainer = document.getElementById('comments-container');
        if (!commentsContainer) {
            console.error('Comments container not found');
            return;
        }
        
        commentsContainer.innerHTML = comments.map(comment => `
            <div class="comment" data-comment-id="${comment.id}">
                <div class="comment-header">
                    <span class="comment-author">${comment.author_name}</span>
                    <span class="comment-date">${new Date(comment.created_at).toLocaleString()}</span>
                    </div>
                <div class="comment-content">${comment.content}</div>
                <div class="comment-actions">
                    <button class="like-button ${comment.is_liked ? 'liked' : ''}" 
                            onclick="toggleCommentLike(${postId}, ${comment.id})">
                        <i class="fas fa-heart"></i>
                        <span class="like-count">${comment.like_count}</span>
                    </button>
                    ${canModifyComment(comment) ? `
                        <button class="edit-button" onclick="editComment(${comment.id})">수정</button>
                        <button class="delete-button" onclick="deleteComment(${postId}, ${comment.id})">삭제</button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading comments:', error);
        showToast('댓글을 불러오는데 실패했습니다.', 'error');
    }
}

async function toggleCommentLike(postId, commentId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showToast('로그인이 필요합니다.', 'error');
            return;
        }

        const response = await fetch(`/api/blog/posts/${postId}/comments/${commentId}/like`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to toggle like');
        }

        const result = await response.json();
        console.log('Like toggle result:', result);

        // 댓글 목록 새로고침
        await loadComments(postId);
        
        showToast(result.message, 'success');
    } catch (error) {
        console.error('Error toggling comment like:', error);
        showToast('좋아요 처리에 실패했습니다.', 'error');
    }
}

// 댓글 수정 폼 표시
async function editComment(commentId) {
    try {
        console.log('Starting editComment function for comment ID:', commentId);
        
        // 현재 경로에서 postId 추출
        const pathParts = window.location.pathname.split('/');
        const postId = pathParts[pathParts.length - 1];
        console.log('Post ID from URL:', postId);

        // 사용자 정보 가져오기
        const currentUser = await getCurrentUser();
        console.log('Current user in editComment:', currentUser);
        
        if (!currentUser) {
            console.error('User is not authenticated');
            showToast('로그인이 필요합니다.', 'error');
            return;
        }
        
        // 댓글 정보 가져오기
        const response = await fetch(`/api/blog/posts/${postId}/comments`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            console.error('Failed to fetch comments:', response.status, response.statusText);
            showToast('댓글 정보를 가져오는데 실패했습니다.', 'error');
            return;
        }
        
        const comments = await response.json();
        console.log('All comments for post:', comments);
        
        // commentId로 댓글 찾기
        const commentIdInt = parseInt(commentId);
        const comment = comments.find(c => parseInt(c.id) === commentIdInt);
        
        if (!comment) {
            console.error(`Comment with ID ${commentId} not found`);
            showToast('댓글을 찾을 수 없습니다.', 'error');
            return;
        }
        
        console.log('Found comment to edit:', comment);
        
        // 권한 체크 (관리자이거나 댓글 작성자인 경우)
        const isAdmin = currentUser.role === 'admin';
        const currentUserId = parseInt(currentUser.id);
        const commentAuthorId = parseInt(comment.author_id);
        const isAuthor = currentUserId === commentAuthorId;
        const canModify = isAdmin || isAuthor;
        
        console.log('Edit permissions:', {
            comment_id: commentIdInt,
            comment_author_id: commentAuthorId,
            current_user_id: currentUserId,
            isAdmin,
            isAuthor,
            canModify
        });
        
        if (!canModify) {
            console.error('User does not have permission to edit this comment');
            showToast('댓글 수정 권한이 없습니다.', 'error');
            return;
        }
        
        // 댓글 DOM 요소 가져오기
        const commentElement = document.getElementById(`comment-${commentIdInt}`);
        if (!commentElement) {
            console.error(`Comment element #comment-${commentIdInt} not found in DOM`);
            return;
        }
        
        // 원래 내용 저장
        const originalContent = comment.content;
        
        // 수정 폼으로 변경
        const cardBody = commentElement.querySelector('.card-body');
        const originalHTML = cardBody.innerHTML;
        
        cardBody.innerHTML = `
            <h6 class="card-subtitle mb-2 text-muted">
                ${comment.author_name} · 
                ${new Date(comment.created_at).toLocaleDateString()}
            </h6>
            <form id="edit-comment-form-${commentIdInt}">
                <div class="form-group">
                    <textarea class="form-control mb-3" id="edit-comment-content-${commentIdInt}" rows="3">${originalContent}</textarea>
                    </div>
                <div class="d-flex justify-content-end gap-2">
                    <button type="button" class="btn btn-outline-secondary" onclick="cancelEditComment(${commentIdInt})">
                        취소
                    </button>
                    <button type="button" class="btn btn-primary" onclick="submitCommentEdit(${commentIdInt})">
                        저장
                    </button>
                </div>
            </form>
        `;
        
        // 텍스트 영역에 포커스
        document.getElementById(`edit-comment-content-${commentIdInt}`).focus();
        
    } catch (error) {
        console.error('Error in editComment function:', error);
        showToast('댓글 수정 중 오류가 발생했습니다.', 'error');
    }
}

// 댓글 수정 취소
function cancelEditComment(commentId) {
    try {
        console.log('Cancelling edit for comment ID:', commentId);
        const commentIdInt = parseInt(commentId);
        
        // 댓글 요소 가져오기
        const commentElement = document.getElementById(`comment-${commentIdInt}`);
        if (!commentElement) {
            console.error(`Comment element with ID comment-${commentIdInt} not found`);
            return;
        }

        // 현재 경로에서 postId 추출
        const pathParts = window.location.pathname.split('/');
        const postId = pathParts[pathParts.length - 1];
        console.log('Post ID from URL:', postId);
        
        // 댓글 목록 다시 로드
        loadComments(postId);
    } catch (error) {
        console.error('Error in cancelEditComment function:', error);
        showToast('댓글 편집 취소 중 오류가 발생했습니다.', 'error');
    }
}

// 댓글 수정 제출 처리
async function submitCommentEdit(commentId) {
    try {
        console.log('Starting submitCommentEdit for comment ID:', commentId);
        const commentIdInt = parseInt(commentId);
        
        // 현재 경로에서 postId 추출
        const pathParts = window.location.pathname.split('/');
        const postId = pathParts[pathParts.length - 1];
        console.log('Post ID from URL:', postId);
        
        // 사용자 정보 가져오기
        const currentUser = await getCurrentUser();
        console.log('Current user in submitCommentEdit:', currentUser);
        
        if (!currentUser) {
            console.error('User is not authenticated');
            showToast('로그인이 필요합니다.', 'error');
            return;
        }
        
        // 새 내용 가져오기
        const textarea = document.getElementById(`edit-comment-content-${commentIdInt}`);
        if (!textarea) {
            console.error(`Textarea element #edit-comment-content-${commentIdInt} not found`);
            showToast('댓글 내용을 찾을 수 없습니다.', 'error');
            return;
        }
        
        const newContent = textarea.value.trim();
        console.log('New comment content:', newContent);
        
        if (!newContent) {
            console.error('Comment content is empty');
            showToast('댓글 내용을 입력해주세요.', 'error');
            return;
        }
        
        // 댓글 정보 가져오기
        const commentsResponse = await fetch(`/api/blog/posts/${postId}/comments`, {
            headers: getAuthHeaders()
        });
        
        if (!commentsResponse.ok) {
            console.error('Failed to fetch comments:', commentsResponse.status, commentsResponse.statusText);
            showToast('댓글 정보를 가져오는데 실패했습니다.', 'error');
            return;
        }
        
        const comments = await commentsResponse.json();
        console.log('All comments for post:', comments);
        
        // 댓글 찾기
        const comment = comments.find(c => parseInt(c.id) === commentIdInt);
        
        if (!comment) {
            console.error(`Comment with ID ${commentIdInt} not found`);
            showToast('댓글을 찾을 수 없습니다.', 'error');
            return;
        }
        
        console.log('Found comment to update:', comment);
        
        // 권한 체크 (관리자이거나 댓글 작성자인 경우)
        const isAdmin = currentUser.role === 'admin';
        const currentUserId = parseInt(currentUser.id);
        const commentAuthorId = parseInt(comment.author_id);
        const isAuthor = currentUserId === commentAuthorId;
        const canModify = isAdmin || isAuthor;
        
        console.log('Edit permissions:', {
            comment_id: commentIdInt,
            comment_author_id: commentAuthorId,
            current_user_id: currentUserId,
            isAdmin,
            isAuthor,
            canModify
        });
        
        if (!canModify) {
            console.error('User does not have permission to edit this comment');
            showToast('댓글 수정 권한이 없습니다.', 'error');
            return;
        }
        
        // 댓글 수정 API 호출
        const updateResponse = await fetch(`/api/blog/comments/${commentIdInt}`, {
            method: 'PUT',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: newContent })
        });
        
        if (!updateResponse.ok) {
            console.error('Failed to update comment:', updateResponse.status, updateResponse.statusText);
            showToast('댓글 수정에 실패했습니다.', 'error');
            return;
        }
        
        console.log('Comment successfully updated');
        showToast('댓글이 수정되었습니다.', 'success');
        
        // 댓글 다시 로드
        loadComments(postId);
        
    } catch (error) {
        console.error('Error in submitCommentEdit function:', error);
        showToast('댓글 수정 중 오류가 발생했습니다.', 'error');
    }
}

// 댓글 삭제 함수
async function deleteComment(commentId) {
    try {
        console.log('Starting deleteComment for comment ID:', commentId);
        const commentIdInt = parseInt(commentId);
        
        // 현재 경로에서 postId 추출
        const pathParts = window.location.pathname.split('/');
        const postId = pathParts[pathParts.length - 1];
        console.log('Post ID from URL:', postId);
        
        // 사용자 정보 가져오기
        const currentUser = await getCurrentUser();
        console.log('Current user in deleteComment:', currentUser);
        
        if (!currentUser) {
            console.error('User is not authenticated');
            showToast('로그인이 필요합니다.', 'error');
            return;
        }
        
        // 사용자 확인
        if (!confirm('정말 댓글을 삭제하시겠습니까?')) {
            console.log('User cancelled comment deletion');
            return;
        }
        
        // 댓글 정보 가져오기
        const commentsResponse = await fetch(`/api/blog/posts/${postId}/comments`, {
            headers: getAuthHeaders()
        });
        
        if (!commentsResponse.ok) {
            console.error('Failed to fetch comments:', commentsResponse.status, commentsResponse.statusText);
            showToast('댓글 정보를 가져오는데 실패했습니다.', 'error');
            return;
        }
        
        const comments = await commentsResponse.json();
        console.log('All comments for post:', comments);
        
        // 댓글 찾기
        const comment = comments.find(c => parseInt(c.id) === commentIdInt);
        
        if (!comment) {
            console.error(`Comment with ID ${commentIdInt} not found`);
            showToast('댓글을 찾을 수 없습니다.', 'error');
            return;
        }
        
        console.log('Found comment to delete:', comment);
        
        // 권한 체크 (관리자이거나 댓글 작성자인 경우)
        const isAdmin = currentUser.role === 'admin';
        const currentUserId = parseInt(currentUser.id);
        const commentAuthorId = parseInt(comment.author_id);
        const isAuthor = currentUserId === commentAuthorId;
        const canModify = isAdmin || isAuthor;
        
        console.log('Delete permissions:', {
            comment_id: commentIdInt,
            comment_author_id: commentAuthorId,
            current_user_id: currentUserId,
            isAdmin,
            isAuthor,
            canModify
        });
        
        if (!canModify) {
            console.error('User does not have permission to delete this comment');
            showToast('댓글 삭제 권한이 없습니다.', 'error');
            return;
        }
        
        // 댓글 삭제 API 호출
        const deleteResponse = await fetch(`/api/blog/comments/${commentIdInt}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (!deleteResponse.ok) {
            console.error('Failed to delete comment:', deleteResponse.status, deleteResponse.statusText);
            showToast('댓글 삭제에 실패했습니다.', 'error');
            return;
        }
        
        console.log('Comment successfully deleted');
        showToast('댓글이 삭제되었습니다.', 'success');
        
        // 댓글 다시 로드
        loadComments(postId);
        
    } catch (error) {
        console.error('Error in deleteComment function:', error);
        showToast('댓글 삭제 중 오류가 발생했습니다.', 'error');
    }
}

// 댓글 작성
async function submitComment(event, postId) {
    event.preventDefault();
    
    const content = event.target.content.value.trim();
    if (!content) {
        showAlert('댓글 내용을 입력해주세요.', 'warning');
        return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
        showAlert('로그인이 필요합니다.', 'warning');
        showLoginModal();
        return;
    }
    
    try {
        const response = await fetch(`/api/blog/posts/${postId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content })
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                showAlert('로그인이 필요합니다.', 'warning');
                showLoginModal();
                return;
            }
            throw new Error('댓글 작성에 실패했습니다.');
        }
        
        // 폼 초기화
        event.target.reset();
        
        showAlert('댓글이 작성되었습니다.', 'success');
        
        // 댓글 목록 다시 로드
        await loadComments(postId);
    } catch (error) {
        console.error('Error:', error);
        showAlert(error.message, 'danger');
    }
}

// 새 블로그 게시글 작성 페이지
async function newBlogPostPage() {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        showAlert('로그인이 필요합니다.', 'warning');
        window.router.navigate('/login');
        return;
    }

    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
        <div class="container mt-4">
            <div class="card">
                <div class="card-body">
                    <h2 class="card-title mb-4">새 게시글 작성</h2>
                    <form id="post-form">
                        <div class="mb-3">
                            <label for="title" class="form-label">제목</label>
                            <input type="text" class="form-control" id="title" required>
                    </div>
                        <div class="mb-3">
                            <label for="content" class="form-label">내용</label>
                            <textarea class="form-control" id="content" rows="10" required></textarea>
                        </div>
                        <div class="mb-3">
                            <label for="tags" class="form-label">태그 (쉼표로 구분)</label>
                            <input type="text" class="form-control" id="tags" placeholder="예: 기술, 프로그래밍, 웹개발">
                </div>
                        <div class="d-flex justify-content-between">
                            <button type="button" class="btn btn-secondary" onclick="window.router.navigate('/blog')">취소</button>
                            <button type="submit" class="btn btn-primary">작성하기</button>
            </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    // 폼 제출 이벤트 리스너
    const form = document.getElementById('post-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const title = document.getElementById('title').value;
        const content = document.getElementById('content').value;
        const tags = document.getElementById('tags').value.split(',').map(tag => tag.trim()).filter(tag => tag);
        
        try {
            const response = await fetch('/api/blog/posts', {
                method: 'POST',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ title, content, tags })
            });
            
            if (!response.ok) {
                throw new Error('게시글 작성에 실패했습니다.');
            }
            
            showAlert('게시글이 작성되었습니다.', 'success');
            window.router.navigate('/blog');
        } catch (error) {
            console.error('Error:', error);
            showAlert(error.message, 'danger');
        }
    });
}

// 새 프로젝트 작성 페이지
async function newProjectPage() {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        showAlert('로그인이 필요합니다.', 'warning');
        window.router.navigate('/login');
        return;
    }

    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
        <div class="container mt-4">
            <div class="card">
                <div class="card-body">
                    <h2 class="card-title mb-4">새 프로젝트 등록</h2>
                    <form id="project-form">
                        <div class="mb-3">
                            <label for="title" class="form-label">프로젝트 제목</label>
                            <input type="text" class="form-control" id="title" required>
                        </div>
                        <div class="mb-3">
                            <label for="description" class="form-label">프로젝트 설명</label>
                            <textarea class="form-control" id="description" rows="5" required></textarea>
                        </div>
                        <div class="mb-3">
                            <label for="github_url" class="form-label">GitHub URL</label>
                            <input type="url" class="form-control" id="github_url" placeholder="https://github.com/username/project">
                        </div>
                        <div class="mb-3">
                            <label for="demo_url" class="form-label">데모 URL</label>
                            <input type="url" class="form-control" id="demo_url" placeholder="https://example.com">
                        </div>
                        <div class="mb-3">
                            <label for="technologies" class="form-label">사용 기술 (쉼표로 구분)</label>
                            <input type="text" class="form-control" id="technologies" placeholder="예: React, Node.js, MongoDB">
                        </div>
                        <div class="d-flex justify-content-between">
                            <button type="button" class="btn btn-secondary" onclick="window.router.navigate('/projects')">취소</button>
                            <button type="submit" class="btn btn-primary">등록하기</button>
                        </div>
                    </form>
                </div>
                </div>
            </div>
        `;
        
    // 폼 제출 이벤트 리스너
    const form = document.getElementById('project-form');
    form.addEventListener('submit', async (e) => {
                e.preventDefault();
        
        const title = document.getElementById('title').value;
        const description = document.getElementById('description').value;
        const github_url = document.getElementById('github_url').value;
        const demo_url = document.getElementById('demo_url').value;
        const technologies = document.getElementById('technologies').value
            .split(',')
            .map(tech => tech.trim())
            .filter(tech => tech);
        
        try {
            const response = await fetch('/api/projects', {
                method: 'POST',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title,
                    description,
                    github_url,
                    demo_url,
                    technologies
                })
            });
            
            if (!response.ok) {
                throw new Error('프로젝트 등록에 실패했습니다.');
            }
            
            showAlert('프로젝트가 등록되었습니다.', 'success');
            window.router.navigate('/projects');
    } catch (error) {
        console.error('Error:', error);
            showAlert(error.message, 'danger');
        }
    });
}

// 프로젝트 페이지
async function projectsPage() {
    try {
        console.log('Starting projectsPage function');
        const currentUser = await getCurrentUser();
        console.log('Current user:', currentUser);

        const mainContent = document.getElementById('main-content');
        if (!mainContent) {
            console.error('main-content element not found');
            return;
        }

        // 프로젝트 페이지 기본 레이아웃
        mainContent.innerHTML = `
            <div class="container mt-4">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h2>프로젝트</h2>
                    ${currentUser ? `
                        <a href="/projects/new" class="btn btn-primary">
                            <i class="fas fa-plus me-2"></i>새 프로젝트
                        </a>
                    ` : ''}
                </div>
                <div id="projects-list" class="row">
                    <div class="col-12 text-center p-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 프로젝트 목록 가져오기
        console.log('Fetching projects data...');
        const token = localStorage.getItem('token');
        const headers = token ? 
            { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : 
            { 'Content-Type': 'application/json' };

        const response = await fetch('/api/projects', { headers });
        
        if (!response.ok) {
            console.error('Failed to fetch projects:', response.status);
            throw new Error('프로젝트 목록을 불러오는데 실패했습니다.');
        }
        
        const projects = await response.json();
        console.log('Projects data:', projects);
        
        const projectsList = document.getElementById('projects-list');
        if (!projectsList) {
            console.error('projects-list container not found');
            return;
        }
        
        if (projects.length === 0) {
            projectsList.innerHTML = '<div class="col-12"><p class="text-center text-muted">등록된 프로젝트가 없습니다.</p></div>';
            return;
        }
        
        // 프로젝트 목록 화면에 표시
        projectsList.innerHTML = projects.map(project => `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100 shadow-sm">
                <div class="card-body">
                        <h5 class="card-title">${project.title}</h5>
                        <p class="card-text text-truncate">${project.description}</p>
                        <div class="mb-3">
                            ${project.technologies && project.technologies.length > 0 ? 
                                project.technologies.map(tech => 
                                    `<span class="badge bg-secondary me-1">${tech}</span>`
                                ).join('') : ''}
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">상태: ${project.status || '진행 중'}</small>
                            <small class="text-muted">리더: ${project.leader_name || '알 수 없음'}</small>
                        </div>
                    </div>
                    <div class="card-footer bg-transparent">
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">${new Date(project.created_at).toLocaleDateString()}</small>
                            <a href="/projects/${project.id}" class="btn btn-primary btn-sm">자세히 보기</a>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error in projectsPage:', error);
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            const projectsList = mainContent.querySelector('#projects-list');
            if (projectsList) {
                projectsList.innerHTML = `
                    <div class="col-12">
                        <div class="alert alert-danger">
                            프로젝트 목록을 불러오는데 실패했습니다. 다시 시도해주세요.
                        </div>
                    </div>
                `;
            }
        }
    }
}

// 프로젝트 상세 페이지
async function projectDetailPage(params) {
    try {
        const response = await fetch(`/api/projects/${params.id}`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error('프로젝트를 불러오는데 실패했습니다.');
        }
        
        const project = await response.json();
        const currentUser = await getCurrentUser();
        const canEdit = currentUser && (currentUser.id === project.author_id || currentUser.role === 'admin');
        
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="container mt-4">
            <div class="card">
                <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                    <h2 class="card-title">${project.title}</h2>
                        <div class="btn-group">
                                <button class="btn btn-secondary" onclick="window.router.navigate('/projects')">목록으로</button>
                                ${canEdit ? `
                            <button class="btn btn-primary" onclick="editProject(${project.id})">수정</button>
                            <button class="btn btn-danger" onclick="deleteProject(${project.id})">삭제</button>
                                ` : ''}
                        </div>
                        </div>
                        <p class="card-text">${project.description}</p>
                        <div class="mb-3">
                            ${project.technologies.map(tech => 
                                `<span class="badge bg-secondary me-1">${tech}</span>`
                            ).join('')}
                        </div>
                        <div class="mb-3">
                            <small class="text-muted">
                                작성자: ${project.author_name} | 
                                작성일: ${new Date(project.created_at).toLocaleString()}
                            </small>
                        </div>
                        ${project.github_url ? `
                            <a href="${project.github_url}" target="_blank" class="btn btn-outline-dark me-2">
                                <i class="fab fa-github me-2"></i>GitHub
                            </a>
                        ` : ''}
                        ${project.demo_url ? `
                            <a href="${project.demo_url}" target="_blank" class="btn btn-outline-primary">
                                <i class="fas fa-external-link-alt me-2"></i>데모
                            </a>
                    ` : ''}
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error:', error);
        showAlert(error.message, 'danger');
    }
}

// 프로필 페이지
async function profilePage() {
    try {
        console.log('Starting profilePage function');
        const currentUser = await getCurrentUser();
        console.log('Current user:', currentUser);
        
        if (!currentUser) {
            console.log('No current user, showing login form');
            showLoginForm();
        return;
    }
    
        const mainContent = document.getElementById('main-content');
        if (!mainContent) {
            console.error('main-content element not found');
            return;
        }

        // 프로필 데이터 가져오기
        console.log('Fetching profile data...');
        const token = localStorage.getItem('token');
        const profileResponse = await fetch('/api/users/profile', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!profileResponse.ok) {
            console.error('Failed to fetch profile data:', profileResponse.status);
    mainContent.innerHTML = `
        <div class="container mt-4">
                    <div class="alert alert-danger">
                        프로필 정보를 불러오는데 실패했습니다. 다시 시도해주세요.
                    </div>
                </div>
            `;
            return;
        }

        const profileData = await profileResponse.json();
        console.log('Profile data:', profileData);

        const posts = profileData.posts || [];
        const projects = profileData.projects || [];

        // HTML 템플릿 생성
        const profileHTML = `
            <div class="container mt-4">
                <div class="row">
                    <div class="col-md-4">
                        <div class="card mb-4">
                            <div class="card-body text-center">
                                <h5 class="card-title">${currentUser.name}</h5>
                                <p class="card-text">${currentUser.email}</p>
                                <p class="card-text">${currentUser.role === 'admin' ? '관리자' : '일반 사용자'}</p>
                                <button class="btn btn-primary" onclick="showEditProfileForm()">프로필 수정</button>
                            </div>
                        </div>
                        <div class="card mb-4">
                            <div class="card-header">
                                <h5>통계</h5>
                            </div>
                <div class="card-body">
                                <p>게시글: ${profileData.stats?.post_count || 0}</p>
                                <p>프로젝트: ${profileData.stats?.project_count || 0}</p>
                                <p>좋아요: ${profileData.stats?.like_count || 0}</p>
                                <p>댓글: ${profileData.stats?.comment_count || 0}</p>
                        </div>
                        </div>
                    </div>
                    <div class="col-md-8">
                        <div class="card mb-4">
                            <div class="card-header">
                                <h5>내 게시글</h5>
                            </div>
                            <div class="card-body">
                                ${posts && posts.length > 0 ? posts.map(post => `
                        <div class="mb-3">
                                        <h6><a href="/blog/${post.id}">${post.title}</a></h6>
                                        <div class="d-flex justify-content-between">
                                            <small class="text-muted">${new Date(post.created_at).toLocaleDateString()}</small>
                                            <small class="text-muted">
                                                <i class="far fa-heart"></i> ${post.like_count || 0} &nbsp;
                                                <i class="far fa-comment"></i> ${post.comment_count || 0}
                                            </small>
                        </div>
                                    </div>
                                `).join('') : '<p>작성한 게시글이 없습니다.</p>'}
                            </div>
                        </div>
                        <div class="card">
                            <div class="card-header">
                                <h5>내 프로젝트</h5>
                            </div>
                            <div class="card-body">
                                ${projects && projects.length > 0 ? projects.map(project => `
                                    <div class="mb-3">
                                        <h6><a href="/projects/${project.id}">${project.title}</a></h6>
                        <div class="d-flex justify-content-between">
                                            <small class="text-muted">${new Date(project.created_at).toLocaleDateString()}</small>
                                            <small class="text-muted">상태: ${project.status || '진행 중'}</small>
                        </div>
                                    </div>
                                `).join('') : '<p>참여 중인 프로젝트가 없습니다.</p>'}
                            </div>
                        </div>
                </div>
            </div>
        </div>
    `;
    
        console.log('Setting main content HTML');
        mainContent.innerHTML = profileHTML;
        console.log('Profile page rendered');

    } catch (error) {
        console.error('Error in profilePage:', error);
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="container mt-4">
                    <div class="alert alert-danger">
                        프로필 페이지를 불러오는데 실패했습니다. 다시 시도해주세요.
                    </div>
                </div>
            `;
        }
    }
}

// 관리자 페이지
async function adminPage() {
    try {
        console.log('Starting adminPage function');
        const currentUser = await getCurrentUser();
        console.log('Current user:', currentUser);
        
        if (!currentUser || currentUser.role !== 'admin') {
            console.log('Not admin, redirecting to home');
            showAlert('관리자 권한이 필요합니다.', 'warning');
            window.router.navigate('/');
            return;
        }

        const mainContent = document.getElementById('main-content');
        if (!mainContent) {
            console.error('main-content element not found');
            return;
        }

        // 기본 레이아웃 구성
        mainContent.innerHTML = `
            <div class="container mt-4">
                <h2>관리자 페이지</h2>
                <div class="row mt-4">
                    <div class="col-md-6 mb-4">
                        <div class="card h-100">
                            <div class="card-header">
                                <h4>사용자 관리</h4>
                            </div>
                            <div class="card-body">
                                <div id="users-list" class="list-group">
                                    <div class="text-center p-3">
                                        <div class="spinner-border text-primary" role="status">
                                            <span class="visually-hidden">Loading...</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6 mb-4">
                        <div class="card h-100">
                            <div class="card-header">
                                <h4>시스템 통계</h4>
                            </div>
                            <div class="card-body">
                                <div id="stats">
                                    <div class="text-center p-3">
                                        <div class="spinner-border text-primary" role="status">
                                            <span class="visually-hidden">Loading...</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-6 mb-4">
                        <div class="card h-100">
                            <div class="card-header">
                                <h4>최근 게시글</h4>
                            </div>
                            <div class="card-body">
                                <div id="recent-posts" class="list-group">
                                    <div class="text-center p-3">
                                        <div class="spinner-border text-primary" role="status">
                                            <span class="visually-hidden">Loading...</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6 mb-4">
                        <div class="card h-100">
                            <div class="card-header">
                                <h4>최근 프로젝트</h4>
                            </div>
                            <div class="card-body">
                                <div id="recent-projects" class="list-group">
                                    <div class="text-center p-3">
                                        <div class="spinner-border text-primary" role="status">
                                            <span class="visually-hidden">Loading...</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 사용자 목록과 통계 데이터 로드
        loadAdminData();
        
    } catch (error) {
        console.error('Error in adminPage:', error);
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="container mt-4">
                    <div class="alert alert-danger">
                        관리자 페이지를 불러오는데 실패했습니다. 다시 시도해주세요.
                    </div>
                </div>
            `;
        }
    }
}

// 관리자 데이터 로드
async function loadAdminData() {
    try {
        console.log('Loading admin data');
        const token = localStorage.getItem('token');
        
        // 대시보드 데이터 가져오기
        const dashboardResponse = await fetch('/api/admin/dashboard', {
                    headers: {
                'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
            }
        });
        
        if (!dashboardResponse.ok) {
            console.error('Failed to fetch dashboard data:', dashboardResponse.status);
            throw new Error('대시보드 데이터를 가져오는데 실패했습니다.');
        }
        
        const dashboardData = await dashboardResponse.json();
        console.log('Dashboard data:', dashboardData);
        
        // 사용자 목록 업데이트
        const usersList = document.getElementById('users-list');
        if (usersList && dashboardData.recentUsers && dashboardData.recentUsers.length > 0) {
            usersList.innerHTML = dashboardData.recentUsers.map(user => `
                <div class="list-group-item">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6>${user.name}</h6>
                            <small>${user.email}</small>
                        </div>
                        <div>
                            <span class="badge ${user.role === 'admin' ? 'bg-danger' : 'bg-primary'}">${user.role}</span>
                            <button class="btn btn-sm btn-outline-secondary ms-2" onclick="showUserDetails(${user.id})">
                                <i class="fas fa-info-circle"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        } else if (usersList) {
            usersList.innerHTML = '<p class="text-center">사용자가 없습니다.</p>';
        }
        
        // 통계 업데이트
        const statsContainer = document.getElementById('stats');
        if (statsContainer && dashboardData.stats) {
            statsContainer.innerHTML = `
                <div class="row text-center">
                    <div class="col-6 mb-3">
                        <div class="card bg-light">
                            <div class="card-body">
                                <h2 class="display-6">${dashboardData.stats.users}</h2>
                                <p class="lead">사용자</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-6 mb-3">
                        <div class="card bg-light">
                            <div class="card-body">
                                <h2 class="display-6">${dashboardData.stats.posts}</h2>
                                <p class="lead">게시글</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="card bg-light">
                            <div class="card-body">
                                <h2 class="display-6">${dashboardData.stats.projects}</h2>
                                <p class="lead">프로젝트</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="card bg-light">
                            <div class="card-body">
                                <h2 class="display-6">${dashboardData.stats.comments}</h2>
                                <p class="lead">댓글</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else if (statsContainer) {
            statsContainer.innerHTML = '<p class="text-center">통계 데이터를 불러올 수 없습니다.</p>';
        }
        
        // 최근 게시글 업데이트
        const recentPosts = document.getElementById('recent-posts');
        if (recentPosts && dashboardData.recentPosts && dashboardData.recentPosts.length > 0) {
            recentPosts.innerHTML = dashboardData.recentPosts.map(post => `
                <a href="/blog/${post.id}" class="list-group-item list-group-item-action">
                    <div class="d-flex w-100 justify-content-between">
                        <h6 class="mb-1">${post.title}</h6>
                        <small>${new Date(post.created_at).toLocaleDateString()}</small>
                    </div>
                    <small>작성자: ${post.author_name}</small>
                </a>
            `).join('');
        } else if (recentPosts) {
            recentPosts.innerHTML = '<p class="text-center">게시글이 없습니다.</p>';
        }
        
        // 최근 프로젝트 업데이트
        const recentProjects = document.getElementById('recent-projects');
        if (recentProjects && dashboardData.recentProjects && dashboardData.recentProjects.length > 0) {
            recentProjects.innerHTML = dashboardData.recentProjects.map(project => `
                <a href="/projects/${project.id}" class="list-group-item list-group-item-action">
                    <div class="d-flex w-100 justify-content-between">
                        <h6 class="mb-1">${project.title}</h6>
                        <small>${new Date(project.created_at).toLocaleDateString()}</small>
                    </div>
                    <small>리더: ${project.leader_name}</small>
                </a>
            `).join('');
        } else if (recentProjects) {
            recentProjects.innerHTML = '<p class="text-center">프로젝트가 없습니다.</p>';
        }
        
            } catch (error) {
        console.error('Error loading admin data:', error);
        showAlert('관리자 데이터를 불러오는데 실패했습니다.', 'danger');
    }
}

// 최근 게시글 로드
async function loadRecentPosts() {
    try {
        const recentPostsContainer = document.getElementById('recent-posts');
        if (!recentPostsContainer) {
            console.error('recent-posts container not found');
            return;
        }
        
        // 로그인 없이도 볼 수 있는 샘플 게시글 표시
        const samplePosts = [
            {
                id: 1,
                title: '블로그 시작하기',
                content: '블로그를 시작하는 방법에 대한 안내입니다. 로그인하여 자세한 내용을 확인해보세요.',
                tags: ['블로그', '시작하기'],
                author_name: 'Admin',
                created_at: new Date().toISOString()
            },
            {
                id: 2,
                title: '마크다운 작성법',
                content: '마크다운을 이용한 글쓰기 방법을 소개합니다. 로그인하여 자세한 내용을 확인해보세요.',
                tags: ['마크다운', '글쓰기'],
                author_name: 'Admin',
                created_at: new Date().toISOString()
            },
            {
                id: 3,
                title: '프로젝트 관리하기',
                content: '효율적인 프로젝트 관리 방법에 대해 알아봅니다. 로그인하여 자세한 내용을 확인해보세요.',
                tags: ['프로젝트', '관리'],
                author_name: 'Admin',
                created_at: new Date().toISOString()
            }
        ];
        
        // 인증 상태 확인
        const token = localStorage.getItem('token');
        if (token) {
            try {
                // 로그인된 사용자는 API로 실제 데이터 가져오기 시도
                const response = await fetch('/api/blog/posts?limit=5', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const posts = await response.json();
                    
                    if (posts.length > 0) {
                        recentPostsContainer.innerHTML = posts.map(post => `
                            <div class="card mb-2">
                                <div class="card-body">
                                    <h5 class="card-title">
                                        <a href="#" onclick="handlePostClick(${post.id}); return false;" class="text-decoration-none">${post.title}</a>
                                    </h5>
                                    <p class="card-text text-truncate">${post.content}</p>
                                    <div class="mb-2">
                                        ${post.tags ? post.tags.map(tag => 
                                            `<span class="badge bg-secondary me-1">${tag}</span>`
                                        ).join('') : ''}
                                    </div>
                                    <small class="text-muted">${post.author_name} - ${new Date(post.created_at).toLocaleDateString()}</small>
                                </div>
                            </div>
                        `).join('');
                        return;
                    }
                }
            } catch (error) {
                console.error('Error loading recent posts:', error);
            }
        }
        
        // API 요청 실패 또는 로그인되지 않은 경우 샘플 데이터 표시
        recentPostsContainer.innerHTML = samplePosts.map(post => `
            <div class="card mb-2">
                <div class="card-body">
                    <h5 class="card-title">
                        <a href="#" onclick="handlePostClick(${post.id}); return false;" class="text-decoration-none">${post.title}</a>
                    </h5>
                    <p class="card-text text-truncate">${post.content}</p>
                    <div class="mb-2">
                        ${post.tags ? post.tags.map(tag => 
                            `<span class="badge bg-secondary me-1">${tag}</span>`
                        ).join('') : ''}
                    </div>
                    <small class="text-muted">${post.author_name} - ${new Date(post.created_at).toLocaleDateString()}</small>
                </div>
            </div>
        `).join('');
            } catch (error) {
        console.error('Error loading recent posts:', error);
        const recentPostsContainer = document.getElementById('recent-posts');
        if (recentPostsContainer) {
            recentPostsContainer.innerHTML = '<p class="text-muted">게시글을 불러오는데 실패했습니다.</p>';
        }
    }
}

// 최근 프로젝트 로드
async function loadRecentProjects() {
    try {
        const recentProjectsContainer = document.getElementById('recent-projects');
        if (!recentProjectsContainer) {
            console.error('recent-projects container not found');
            return;
        }
        
        // 로그인 없이도 볼 수 있는 샘플 프로젝트 표시
        const sampleProjects = [
            {
                id: 1,
                title: '웹 포트폴리오',
                description: '개인 포트폴리오 웹사이트 제작 프로젝트입니다. 로그인하여 자세한 내용을 확인해보세요.',
                technologies: ['HTML', 'CSS', 'JavaScript'],
                author_name: 'Admin'
            },
            {
                id: 2,
                title: '메모 앱',
                description: '실시간 동기화 기능을 갖춘 메모 애플리케이션입니다. 로그인하여 자세한 내용을 확인해보세요.',
                technologies: ['React', 'Node.js', 'MongoDB'],
                author_name: 'Admin'
            },
            {
                id: 3,
                title: '일정 관리 시스템',
                description: '개인 및 팀 일정을 관리할 수 있는 시스템입니다. 로그인하여 자세한 내용을 확인해보세요.',
                technologies: ['Vue.js', 'Express', 'MySQL'],
                author_name: 'Admin'
            }
        ];
        
        // 인증 상태 확인
        const token = localStorage.getItem('token');
        if (token) {
            try {
                // 로그인된 사용자는 API로 실제 데이터 가져오기 시도
                const response = await fetch('/api/projects?limit=3', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const projects = await response.json();
                    
                    if (projects.length > 0) {
                        recentProjectsContainer.innerHTML = projects.map(project => `
                            <div class="card mb-2">
                                <div class="card-body">
                                    <h5 class="card-title">
                                        <a href="#" onclick="handleProjectClick(${project.id}); return false;" class="text-decoration-none">${project.title}</a>
                                    </h5>
                                    <p class="card-text text-truncate">${project.description}</p>
                                    <div class="mb-2">
                                        ${project.technologies ? project.technologies.map(tech => 
                                            `<span class="badge bg-secondary me-1">${tech}</span>`
                                        ).join('') : ''}
                                    </div>
                                    <small class="text-muted">${project.author_name}</small>
                                </div>
                            </div>
                        `).join('');
                        return;
                    }
                }
    } catch (error) {
                console.error('Error loading recent projects:', error);
            }
        }
        
        // API 요청 실패 또는 로그인되지 않은 경우 샘플 데이터 표시
        recentProjectsContainer.innerHTML = sampleProjects.map(project => `
            <div class="card mb-2">
                <div class="card-body">
                    <h5 class="card-title">
                        <a href="#" onclick="handleProjectClick(${project.id}); return false;" class="text-decoration-none">${project.title}</a>
                    </h5>
                    <p class="card-text text-truncate">${project.description}</p>
                    <div class="mb-2">
                        ${project.technologies ? project.technologies.map(tech => 
                            `<span class="badge bg-secondary me-1">${tech}</span>`
                        ).join('') : ''}
                    </div>
                    <small class="text-muted">${project.author_name}</small>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading recent projects:', error);
        const recentProjectsContainer = document.getElementById('recent-projects');
        if (recentProjectsContainer) {
            recentProjectsContainer.innerHTML = '<p class="text-muted">프로젝트를 불러오는데 실패했습니다.</p>';
        }
    }
}

// 게시글 클릭 핸들러
async function handlePostClick(postId) {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        showAlert('자세한 내용을 보려면 로그인이 필요합니다.', 'warning');
        showLoginModal();
        return;
    }
    window.router.navigate(`/blog/${postId}`);
}

// 프로젝트 클릭 핸들러
async function handleProjectClick(projectId) {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        showAlert('자세한 내용을 보려면 로그인이 필요합니다.', 'warning');
        showLoginModal();
        return;
    }
    window.router.navigate(`/projects/${projectId}`);
}