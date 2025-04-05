// 인증 상태 확인
async function checkAuthStatus() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/auth/status', {
            headers: {
                'Authorization': token ? `Bearer ${token}` : ''
            }
        });

        if (!response.ok) {
            throw new Error('인증 상태 확인에 실패했습니다.');
        }

        const data = await response.json();
        updateAuthUI(data.isAuthenticated, data.user);
    } catch (error) {
        console.error('Error:', error);
        updateAuthUI(false, null);
    }
}

// 인증 버튼 업데이트
function updateAuthButtons(isAuthenticated, user) {
    const authButtons = document.getElementById('auth-buttons');
    
    if (isAuthenticated && user) {
        authButtons.innerHTML = `
            <div class="dropdown">
                <button class="btn btn-outline-light dropdown-toggle" type="button" id="userDropdown" data-bs-toggle="dropdown">
                    ${user.name}
                </button>
                <ul class="dropdown-menu dropdown-menu-end">
                    <li><a class="dropdown-item" href="#" onclick="handleLogout()">로그아웃</a></li>
                </ul>
            </div>
        `;
    } else {
        authButtons.innerHTML = `
            <button class="btn btn-outline-light me-2" onclick="showLoginModal()">로그인</button>
            <button class="btn btn-light" onclick="showRegisterModal()">회원가입</button>
        `;
    }
}

// 로그인 모달 표시
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
                                <label for="loginEmail" class="form-label">이메일</label>
                                <input type="email" class="form-control" id="loginEmail" required>
                            </div>
                            <div class="mb-3">
                                <label for="loginPassword" class="form-label">비밀번호</label>
                                <input type="password" class="form-control" id="loginPassword" required>
                            </div>
                            <button type="submit" class="btn btn-primary w-100">로그인</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 기존 모달 제거
    const existingModal = document.getElementById('loginModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 새 모달 추가
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // 모달 표시
    const modal = new bootstrap.Modal(document.getElementById('loginModal'));
    modal.show();
    
    // 폼 제출 이벤트 리스너
    document.getElementById('login-form').addEventListener('submit', handleLogin);
}

// 회원가입 모달 표시
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
                                <label for="signupName" class="form-label">이름</label>
                                <input type="text" class="form-control" id="signupName" required>
                            </div>
                            <div class="mb-3">
                                <label for="signupEmail" class="form-label">이메일</label>
                                <input type="email" class="form-control" id="signupEmail" required>
                            </div>
                            <div class="mb-3">
                                <label for="signupPassword" class="form-label">비밀번호</label>
                                <input type="password" class="form-control" id="signupPassword" required>
                            </div>
                            <button type="submit" class="btn btn-primary w-100">회원가입</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 기존 모달 제거
    const existingModal = document.getElementById('registerModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 새 모달 추가
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // 모달 표시
    const modal = new bootstrap.Modal(document.getElementById('registerModal'));
    modal.show();
    
    // 폼 제출 이벤트 리스너
    document.getElementById('register-form').addEventListener('submit', handleRegister);
}

// 로그인 처리
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || '로그인에 실패했습니다.');
        }

        // 토큰 저장
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // 성공 메시지 표시
        showAlert('success', '로그인 성공! 환영합니다.');
        
        // 모달 닫기
        const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
        if (loginModal) {
            loginModal.hide();
        }

        // UI 업데이트
        updateAuthUI(true, data.user);
        
        // 페이지 새로고침
        setTimeout(() => {
            window.location.reload();
        }, 1500);

    } catch (error) {
        console.error('Error:', error);
        showAlert('danger', error.message || '로그인 중 오류가 발생했습니다.');
    }
}

// 회원가입 처리
async function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    
    try {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || '회원가입에 실패했습니다.');
        }

        // 성공 메시지 표시
        showAlert('success', '회원가입이 완료되었습니다. 로그인해주세요.');
        
        // 모달 전환
        const signupModal = bootstrap.Modal.getInstance(document.getElementById('signupModal'));
        signupModal.hide();
        
        const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
        loginModal.show();

    } catch (error) {
        console.error('Error:', error);
        showAlert('danger', error.message || '회원가입 중 오류가 발생했습니다.');
    }
}

// 로그아웃 처리
function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateAuthUI(false, null);
    showAlert('success', '로그아웃되었습니다.');
}

// UI 업데이트
function updateAuthUI(isAuthenticated, user) {
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userInfo = document.getElementById('userInfo');

    if (isAuthenticated && user) {
        loginBtn.style.display = 'none';
        signupBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
        userInfo.style.display = 'block';
        userInfo.textContent = `${user.name}님 환영합니다`;
    } else {
        loginBtn.style.display = 'block';
        signupBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
        userInfo.style.display = 'none';
    }
}

// 알림 표시
function showAlert(type, message) {
    const alertContainer = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    alertContainer.appendChild(alert);

    // 5초 후 자동으로 알림 제거
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// 페이지 로드 시 인증 상태 확인
document.addEventListener('DOMContentLoaded', () => {
    // 인증 상태 확인
    checkAuthStatus();
    
    // 메인 페이지 컨텐츠 로드
    loadMainContent();
});

// 메인 페이지 컨텐츠 로드
async function loadMainContent() {
    try {
        const mainContent = document.getElementById('mainContent');
        if (!mainContent) return;
        
        // 메인 페이지 컨텐츠 HTML 생성
        mainContent.innerHTML = `
            <div class="container">
                <div class="row">
                    <div class="col-md-12">
                        <h1>Note4U에 오신 것을 환영합니다</h1>
                        <p>당신의 지식을 공유하고 함께 성장하세요.</p>
                    </div>
                </div>
                <div class="row mt-4">
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-body">
                                <h5 class="card-title">최근 블로그 포스트</h5>
                                <div id="recent-posts"></div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-body">
                                <h5 class="card-title">진행중인 프로젝트</h5>
                                <div id="active-projects"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 최근 포스트와 프로젝트 로드
        await Promise.all([
            loadRecentPosts(),
            loadActiveProjects()
        ]);
    } catch (error) {
        console.error('메인 페이지 컨텐츠 로드 실패:', error);
    }
}

// 메인 페이지 컨텐츠 표시
function displayMainContent(data) {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return;
    
    // 메인 페이지 컨텐츠 HTML 생성
    mainContent.innerHTML = `
        <div class="container">
            <h1>Note4U에 오신 것을 환영합니다</h1>
            <p>당신의 지식을 공유하고 함께 성장하세요.</p>
        </div>
    `;
}

// 게스트 UI 업데이트
function updateUIForGuest() {
    // 인증 버튼 업데이트
    const authButtons = document.getElementById('auth-buttons');
    if (authButtons) {
        authButtons.innerHTML = `
            <a href="/login" class="btn btn-outline-light me-2">로그인</a>
            <a href="/signup" class="btn btn-primary">회원가입</a>
        `;
    }

    // 히어로 버튼 업데이트
    const heroButtons = document.getElementById('hero-buttons');
    if (heroButtons) {
        heroButtons.innerHTML = `
            <a href="/signup" class="btn btn-light btn-lg me-3">시작하기</a>
            <a href="/login" class="btn btn-outline-light btn-lg">로그인</a>
        `;
    }

    // 새 글 작성 버튼 숨기기
    const newPostButton = document.getElementById('new-post-button');
    if (newPostButton) {
        newPostButton.innerHTML = '';
    }

    // 새 프로젝트 버튼 숨기기
    const newProjectButton = document.getElementById('new-project-button');
    if (newProjectButton) {
        newProjectButton.innerHTML = '';
    }
}

// 로그인 사용자 UI 업데이트
function updateUIForUser(user) {
    const authButtons = document.getElementById('auth-buttons');
    const heroButtons = document.getElementById('hero-buttons');
    const newPostBtn = document.getElementById('new-post-button');
    const newProjectBtn = document.getElementById('new-project-button');

    if (authButtons) {
        authButtons.innerHTML = `
            <div class="dropdown">
                <button class="btn btn-outline-light dropdown-toggle" type="button" id="userDropdown" data-bs-toggle="dropdown">
                    <i class="fas fa-user-circle me-2"></i>
                    ${user.email}
                </button>
                <ul class="dropdown-menu dropdown-menu-end">
                    <li><a class="dropdown-item" href="/profile">프로필</a></li>
                    <li><a class="dropdown-item" href="/settings">설정</a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item" href="#" onclick="logout()">로그아웃</a></li>
                </ul>
            </div>
        `;
    }

    if (heroButtons) {
        heroButtons.innerHTML = `
            <a href="/blog/new" class="btn btn-light btn-lg me-3">
                <i class="fas fa-pen me-2"></i>새 글 작성
            </a>
            <a href="/project/new" class="btn btn-outline-light btn-lg">
                <i class="fas fa-project-diagram me-2"></i>새 프로젝트
            </a>
        `;
    }

    if (newPostBtn) {
        newPostBtn.innerHTML = `
            <a href="/blog/new" class="btn btn-primary">
                <i class="fas fa-pen me-2"></i>새 글 작성
            </a>
        `;
    }

    if (newProjectBtn) {
        newProjectBtn.innerHTML = `
            <a href="/project/new" class="btn btn-primary">
                <i class="fas fa-project-diagram me-2"></i>새 프로젝트
            </a>
        `;
    }
}

// 활성 프로젝트 로드
async function loadActiveProjects() {
    try {
        const response = await fetch('/api/projects', {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error('프로젝트를 불러오는데 실패했습니다.');
        }
        
        const projects = await response.json();
        const activeProjectsContainer = document.getElementById('active-projects');
        
        if (projects.length === 0) {
            activeProjectsContainer.innerHTML = '<div class="col-12"><div class="alert alert-info">진행중인 프로젝트가 없습니다.</div></div>';
            return;
        }

        activeProjectsContainer.innerHTML = projects.slice(0, 3).map(project => `
            <div class="col-md-4 mb-4">
                <div class="card h-100">
                    <div class="card-body">
                        <h5 class="card-title">${project.title}</h5>
                        <h6 class="card-subtitle mb-2 text-muted">
                            작성자: ${project.author_name} | 
                            작성일: ${new Date(project.created_at).toLocaleDateString()}
                        </h6>
                        <p class="card-text">${getPostPreview(project.description, 100)}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <a href="/projects/${project.id}" class="btn btn-sm btn-outline-primary">자세히 보기</a>
                            <small class="text-muted">
                                <i class="fas fa-users me-1"></i>${project.member_count}
                                <i class="fas fa-tasks ms-2 me-1"></i>${project.task_count}
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error:', error);
        showAlert(error.message || '프로젝트를 불러오는데 실패했습니다.', 'danger');
    }
}

// 최근 블로그 포스트 로드
async function loadRecentPosts() {
    try {
        const response = await fetch('/api/blog/posts', {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error('최근 포스트를 불러오는데 실패했습니다.');
        }
        
        const posts = await response.json();
        const recentPostsContainer = document.getElementById('recent-posts');
        
        if (posts.length === 0) {
            recentPostsContainer.innerHTML = '<div class="col-12"><div class="alert alert-info">아직 작성된 게시글이 없습니다.</div></div>';
            return;
        }

        recentPostsContainer.innerHTML = posts.slice(0, 3).map(post => `
            <div class="col-md-4 mb-4">
                <div class="card h-100">
                    <div class="card-body">
                        <h5 class="card-title">${post.title}</h5>
                        <h6 class="card-subtitle mb-2 text-muted">
                            작성자: ${post.author_name} | 
                            작성일: ${new Date(post.created_at).toLocaleDateString()}
                        </h6>
                        <p class="card-text">${getPostPreview(post.content, 100)}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <a href="/blog/${post.id}" class="btn btn-sm btn-outline-primary">자세히 보기</a>
                            <small class="text-muted">
                                <i class="fas fa-heart me-1"></i>${post.like_count}
                                <i class="fas fa-comment ms-2 me-1"></i>${post.comment_count}
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error:', error);
        showAlert(error.message || '최근 포스트를 불러오는데 실패했습니다.', 'danger');
    }
}

// 게시글 미리보기 생성
function getPostPreview(content, maxLength) {
    if (!content) return '';
    const plainText = content.replace(/<[^>]*>/g, '');
    return plainText.length > maxLength ? plainText.substring(0, maxLength) + '...' : plainText;
}

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', () => {
    loadRecentPosts();
    loadActiveProjects();
});

// 에러 메시지 표시
function showError(message) {
    const alertHtml = `
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    const alertContainer = document.createElement('div');
    alertContainer.innerHTML = alertHtml;
    document.querySelector('main').insertAdjacentElement('afterbegin', alertContainer.firstChild);
    
    // 3초 후 자동으로 닫기
    setTimeout(() => {
        const alert = document.querySelector('.alert');
        if (alert) {
            alert.remove();
        }
    }, 3000);
}

// 성공 메시지 표시
function showSuccess(message) {
    const alertHtml = `
        <div class="alert alert-success alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    const alertContainer = document.createElement('div');
    alertContainer.innerHTML = alertHtml;
    document.querySelector('main').insertAdjacentElement('afterbegin', alertContainer.firstChild);
    
    // 3초 후 자동으로 닫기
    setTimeout(() => {
        const alert = document.querySelector('.alert');
        if (alert) {
            alert.remove();
        }
    }, 3000);
}

// 날짜 포맷팅
function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

// API 요청에 인증 헤더 추가
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

// API 요청 함수
async function fetchAPI(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: addAuthHeader(options.headers)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || '서버 오류가 발생했습니다.');
        }
        
        return data;
    } catch (error) {
        console.error('API 요청 실패:', error);
        throw error;
    }
}

// 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', () => {
    // Bootstrap 툴팁 초기화
    const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltips.forEach(tooltip => {
        new bootstrap.Tooltip(tooltip);
    });
    
    // Bootstrap 팝오버 초기화
    const popovers = document.querySelectorAll('[data-bs-toggle="popover"]');
    popovers.forEach(popover => {
        new bootstrap.Popover(popover);
    });
    
    // 마크다운 에디터 미리보기 업데이트
    const markdownEditor = document.getElementById('content');
    const markdownPreview = document.getElementById('preview');
    
    if (markdownEditor && markdownPreview) {
        markdownEditor.addEventListener('input', () => {
            const content = markdownEditor.value;
            const html = marked.parse(content);
            markdownPreview.innerHTML = html;
            Prism.highlightAll();
        });
    }
}); 