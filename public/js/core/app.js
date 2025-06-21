// 인증 관련 함수들
async function checkAuthStatus() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        console.log('No token found in localStorage');
        return false;
    }
    
    try {
        console.log('Token found:', token.substring(0, 20) + '...');
        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            console.error('Auth check failed:', response.status);
            throw new Error('인증에 실패했습니다.');
        }
        
        const userData = await response.json();
        console.log('Auth check successful:', userData);
        
        // 사용자 정보 업데이트
        localStorage.setItem('user', JSON.stringify(userData));
        updateAuthUI(true, userData);
        
        return true;
    } catch (error) {
        console.error('Auth check error:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        updateAuthUI(false);
        return false;
    }
}

// 라우터 설정
const router = {
    routes: {
        '/': home,
        '/login': loginPage,
        '/register': registerPage,
        '/blog': blogPage,
        '/blog/new': newBlogPostPage,
        '/blog/:id': blogDetailPage,
        '/projects': projectsPage,
        '/projects/new': newProjectPage,
        '/projects/:id': projectDetailPage,
        '/profile': profilePage
    },
    
    async navigate(path) {
        window.history.pushState({}, '', path);
        await this.loadContent();
    },
    
    async loadContent() {
        const path = window.location.pathname;
        
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
            
            await this.routes[route](params);
        } else {
            await this.routes['/']();
        }
    }
};

// 로그인 페이지
async function loginPage() {
    const mainContent = document.querySelector('#main-content');
    if (!mainContent) return;

    mainContent.innerHTML = `
        <div class="auth-container">
            <h2>로그인</h2>
            <form id="login-form">
                <div class="form-group">
                    <label for="email">이메일</label>
                    <input type="email" id="email" name="email" required>
                </div>
                <div class="form-group">
                    <label for="password">비밀번호</label>
                    <input type="password" id="password" name="password" required>
                </div>
                <button type="submit" class="btn btn-primary">로그인</button>
            </form>
            <p>계정이 없으신가요? <a href="/register">회원가입</a></p>
        </div>
    `;

    // 로그인 폼 이벤트 리스너
    const loginForm = document.getElementById('login-form');
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
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    updateAuthUI(true, data.user);
                    window.router.navigate('/');
                } else {
                    alert(data.message || '로그인에 실패했습니다.');
                }
            } catch (error) {
                console.error('Login error:', error);
                alert('로그인 중 오류가 발생했습니다.');
            }
        });
    }
}

// 회원가입 페이지
async function registerPage() {
    const mainContent = document.querySelector('#main-content');
    if (!mainContent) return;

    mainContent.innerHTML = `
        <div class="auth-container">
            <h2>회원가입</h2>
            <form id="register-form">
                <div class="form-group">
                    <label for="name">이름</label>
                    <input type="text" id="name" name="name" required>
                </div>
                <div class="form-group">
                    <label for="email">이메일</label>
                    <input type="email" id="email" name="email" required>
                </div>
                <div class="form-group">
                    <label for="password">비밀번호</label>
                    <input type="password" id="password" name="password" required>
                </div>
                <div class="form-group">
                    <label for="confirm-password">비밀번호 확인</label>
                    <input type="password" id="confirm-password" name="confirm-password" required>
                </div>
                <button type="submit" class="btn btn-primary">회원가입</button>
            </form>
            <p>이미 계정이 있으신가요? <a href="/login">로그인</a></p>
        </div>
    `;

    // 회원가입 폼 이벤트 리스너
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (password !== confirmPassword) {
                alert('비밀번호가 일치하지 않습니다.');
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
                    alert('회원가입이 완료되었습니다. 로그인해주세요.');
                    window.router.navigate('/login');
                } else {
                    alert(data.message || '회원가입에 실패했습니다.');
                }
            } catch (error) {
                console.error('Registration error:', error);
                alert('회원가입 중 오류가 발생했습니다.');
            }
        });
    }
}

// 로그인 처리
async function login(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        console.log('Attempting login with email:', email);
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error('Login failed:', data.message);
            throw new Error(data.message || '로그인에 실패했습니다.');
        }
        
        // 토큰 저장 전에 기존 토큰 제거
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // 새 토큰 저장
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        console.log('Login successful:', {
            token: data.token.substring(0, 20) + '...',
            user: data.user
        });
        
        // 모달이 있다면 닫기
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
            const modal = bootstrap.Modal.getInstance(loginModal);
            if (modal) {
                modal.hide();
            }
        }
        
        showAlert('로그인되었습니다.', 'success');
        updateAuthUI(true, data.user);
        
        // 페이지 이동 전에 약간의 지연을 줍니다
        await new Promise(resolve => setTimeout(resolve, 1000));
        router.navigate('/');
    } catch (error) {
        console.error('Login error:', error);
        showAlert(error.message, 'danger');
    }
}

// 회원가입 처리
async function register(event) {
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
        
        if (!response.ok) {
            throw new Error('회원가입에 실패했습니다.');
        }
        
        const data = await response.json();
        
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        showAlert('회원가입이 완료되었습니다.', 'success');
        updateAuthUI(true, data.user);
        router.navigate('/');
    } catch (error) {
        console.error('Error:', error);
        showAlert(error.message, 'danger');
    }
}

// 로그아웃 처리
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.navigate('/');
}

// 인증 UI 업데이트
function updateAuthUI(isAuthenticated, user = null) {
    const authButtons = document.getElementById('auth-buttons');
    
    if (isAuthenticated && user) {
        authButtons.innerHTML = `
            <div class="dropdown">
                <button class="btn btn-outline-light dropdown-toggle" type="button" id="userDropdown" data-bs-toggle="dropdown">
                    ${user.name}
                </button>
                <ul class="dropdown-menu dropdown-menu-end">
                    <li><a class="dropdown-item" href="/profile">프로필</a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><button class="dropdown-item" onclick="logout()">로그아웃</button></li>
                </ul>
            </div>
        `;
    } else {
        authButtons.innerHTML = `
            <a href="/login" class="btn btn-primary me-2 px-4 py-2">
                <i class="fas fa-sign-in-alt me-2"></i>로그인
            </a>
            <a href="/register" class="btn btn-outline-light px-4 py-2">
                <i class="fas fa-user-plus me-2"></i>회원가입
            </a>
        `;
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
                                <input type="email" class="form-control" id="email" required>
                            </div>
                            <div class="mb-3">
                                <label for="password" class="form-label">비밀번호</label>
                                <input type="password" class="form-control" id="password" required>
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
    
    document.getElementById('login-form').addEventListener('submit', login);
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
                                <label for="name" class="form-label">이름</label>
                                <input type="text" class="form-control" id="name" required>
                            </div>
                            <div class="mb-3">
                                <label for="email" class="form-label">이메일</label>
                                <input type="email" class="form-control" id="email" required>
                            </div>
                            <div class="mb-3">
                                <label for="password" class="form-label">비밀번호</label>
                                <input type="password" class="form-control" id="password" required>
                            </div>
                            <div class="mb-3">
                                <label for="confirm-password" class="form-label">비밀번호 확인</label>
                                <input type="password" class="form-control" id="confirm-password" required>
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
function getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
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
                <h1 class="display-4">자동화 테스트</h1>
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
        </div>
        <div id="recent-posts-container" class="container mt-5"></div>
        <div id="recent-projects-container" class="container mt-5"></div>
    `;
    fetchRecentPosts();
    fetchRecentProjects();
}

// 블로그 페이지
async function blogPage() {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
        <div class="container mt-4">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2>블로그</h2>
                <a href="/blog/new" class="btn btn-primary">
                    <i class="fas fa-plus"></i> 새 글 작성
                </a>
            </div>
            <div id="blog-posts"></div>
        </div>
    `;
    
    await loadBlogPosts();
}

// 블로그 상세 페이지
async function blogDetailPage(params) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    try {
        await displayPost(params.id);
    } catch (error) {
        console.error('Error:', error);
        mainContent.innerHTML = `
            <div class="container">
                <div class="alert alert-danger">
                    ${error.message}
                </div>
                <a href="/blog" class="btn btn-primary">블로그 목록으로 돌아가기</a>
            </div>
        `;
    }
}

// 프로젝트 페이지
async function projectsPage() {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
        <div class="container mt-4">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2>프로젝트</h2>
                <a href="/projects/new" class="btn btn-primary">
                    <i class="fas fa-plus"></i> 새 프로젝트
                </a>
            </div>
            <div id="projects-list"></div>
        </div>
    `;
    
    await loadProjects();
}

// 프로젝트 상세 페이지
async function projectDetailPage(params) {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
        <div class="container mt-4">
            <div id="project-detail"></div>
        </div>
    `;
    
    await displayProject(params.id);
}

// 프로필 페이지
async function profilePage() {
    const mainContent = document.getElementById('main-content');
    const user = getCurrentUser();
    
    if (!user) {
        router.navigate('/login');
        return;
    }
    
    mainContent.innerHTML = `
        <div class="container mt-4">
            <div class="row">
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-body">
                            <h3 class="card-title">프로필 정보</h3>
                            <p><strong>이름:</strong> ${user.name}</p>
                            <p><strong>이메일:</strong> ${user.email}</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-8">
                    <div class="card">
                        <div class="card-body">
                            <h3 class="card-title">내가 작성한 게시글</h3>
                            <div id="user-posts"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    await loadUserPosts(user.id);
}

// 최근 게시글 로드
async function loadRecentPosts() {
    try {
        const response = await fetch('/api/blog/posts/recent');
        
        if (!response.ok) {
            throw new Error('게시글을 불러오는데 실패했습니다.');
        }
        
        const posts = await response.json();
        const recentPosts = document.getElementById('recent-posts');
        
        if (!posts || posts.length === 0) {
            recentPosts.innerHTML = '<p class="text-muted">게시글이 없습니다.</p>';
            return;
        }
        
        recentPosts.innerHTML = posts.map(post => `
            <div class="card mb-3 border-0">
                <div class="card-body">
                    <h5 class="card-title">
                        <a href="/blog/${post.id}" class="text-decoration-none text-dark">${post.title}</a>
                    </h5>
                    <p class="card-text text-muted small">${post.content.substring(0, 100)}...</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">
                            <i class="fas fa-user"></i> ${post.author_name || '익명'} | 
                            <i class="fas fa-calendar"></i> ${new Date(post.created_at).toLocaleDateString()}
                        </small>
                        <a href="/blog/${post.id}" class="btn btn-sm btn-outline-primary">자세히 보기</a>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('recent-posts').innerHTML = 
            '<div class="alert alert-danger">게시글을 불러오는데 실패했습니다.</div>';
    }
}

// 최근 프로젝트 로드
async function loadRecentProjects() {
    try {
        const response = await fetch('/api/projects/recent');
        
        if (!response.ok) {
            throw new Error('프로젝트를 불러오는데 실패했습니다.');
        }
        
        const projects = await response.json();
        const recentProjects = document.getElementById('recent-projects');
        
        if (!projects || projects.length === 0) {
            recentProjects.innerHTML = '<p class="text-muted">프로젝트가 없습니다.</p>';
            return;
        }
        
        recentProjects.innerHTML = projects.map(project => `
            <div class="card mb-3 border-0">
                <div class="card-body">
                    <h5 class="card-title">
                        <a href="/projects/${project.id}" class="text-decoration-none text-dark">${project.title}</a>
                    </h5>
                    <p class="card-text text-muted small">${project.description.substring(0, 100)}...</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">
                            <i class="fas fa-user"></i> ${project.author_name || '익명'} | 
                            <i class="fas fa-calendar"></i> ${new Date(project.created_at).toLocaleDateString()}
                        </small>
                        <a href="/projects/${project.id}" class="btn btn-sm btn-outline-success">자세히 보기</a>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('recent-projects').innerHTML = 
            '<div class="alert alert-danger">프로젝트를 불러오는데 실패했습니다.</div>';
    }
}

// 사용자의 게시글 로드
async function loadUserPosts(userId) {
    try {
        const response = await fetch(`/api/blog/posts/user/${userId}`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error('게시글을 불러오는데 실패했습니다.');
        }
        
        const posts = await response.json();
        const userPosts = document.getElementById('user-posts');
        
        if (!posts || posts.length === 0) {
            userPosts.innerHTML = '<p class="text-muted">작성한 게시글이 없습니다.</p>';
            return;
        }
        
        userPosts.innerHTML = posts.map(post => `
            <div class="card mb-3">
                <div class="card-body">
                    <h5 class="card-title">
                        <a href="/blog/${post.id}" class="text-decoration-none">${post.title}</a>
                    </h5>
                    <p class="card-text">${post.content.substring(0, 100)}...</p>
                    <p class="card-text">
                        <small class="text-muted">
                            작성일: ${new Date(post.created_at).toLocaleDateString()}
                        </small>
                    </p>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('user-posts').innerHTML = 
            '<div class="alert alert-danger">게시글을 불러오는데 실패했습니다.</div>';
    }
}

// 블로그 게시글 로드
async function loadBlogPosts() {
    try {
        const response = await fetch('/api/blog/posts');
        
        if (!response.ok) {
            throw new Error('게시글을 불러오는데 실패했습니다.');
        }
        
        const posts = await response.json();
        const blogPosts = document.getElementById('blog-posts');
        
        if (!posts || posts.length === 0) {
            blogPosts.innerHTML = '<p class="text-muted">게시글이 없습니다.</p>';
            return;
        }
        
        blogPosts.innerHTML = posts.map(post => `
            <div class="card mb-3">
                <div class="card-body">
                    <h5 class="card-title">
                        <a href="/blog/${post.id}" class="text-decoration-none">${post.title}</a>
                    </h5>
                    <p class="card-text">${post.content.substring(0, 200)}...</p>
                    <p class="card-text">
                        <small class="text-muted">
                            작성자: ${post.author_name || '익명'} | 
                            작성일: ${new Date(post.created_at).toLocaleDateString()}
                        </small>
                    </p>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('blog-posts').innerHTML = 
            '<div class="alert alert-danger">게시글을 불러오는데 실패했습니다.</div>';
    }
}

// 블로그 게시글 상세 표시
async function displayPost(postId) {
    try {
        const response = await fetch(`/api/blog/posts/${postId}`);
        
        if (!response.ok) {
            throw new Error('게시글을 불러오는데 실패했습니다.');
        }
        
        const post = await response.json();
        const postDetail = document.getElementById('blog-post-detail');
        
        postDetail.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <h2 class="card-title">${post.title}</h2>
                    <p class="text-muted mb-4">
                        작성자: ${post.author_name || '익명'} | 
                        작성일: ${new Date(post.created_at).toLocaleDateString()}
                    </p>
                    <div class="card-text mb-4">
                        ${post.content}
                    </div>
                    ${getCurrentUserId() === post.author_id ? `
                        <div class="btn-group">
                            <button class="btn btn-primary" onclick="editPost(${post.id})">수정</button>
                            <button class="btn btn-danger" onclick="deletePost(${post.id})">삭제</button>
                        </div>
                    ` : ''}
                </div>
            </div>
            <div class="card mt-4">
                <div class="card-body">
                    <h4 class="card-title">댓글</h4>
                    <form id="comment-form" class="mb-4">
                        <div class="mb-3">
                            <textarea class="form-control" id="comment-content" rows="3" required></textarea>
                        </div>
                        <button type="submit" class="btn btn-primary">댓글 작성</button>
                    </form>
                    <div id="comments-list"></div>
                </div>
            </div>
        `;
        
        // 댓글 폼 이벤트 리스너
        const commentForm = document.getElementById('comment-form');
        if (commentForm) {
            commentForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await submitComment(e, postId);
            });
        }
        
        // 댓글 로드
        await loadComments(postId);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('blog-post-detail').innerHTML = 
            '<div class="alert alert-danger">게시글을 불러오는데 실패했습니다.</div>';
    }
}

// 프로젝트 목록 로드
async function loadProjects() {
    try {
        const response = await fetch('/api/projects');
        
        if (!response.ok) {
            throw new Error('프로젝트를 불러오는데 실패했습니다.');
        }
        
        const projects = await response.json();
        const projectsList = document.getElementById('projects-list');
        
        if (!projects || projects.length === 0) {
            projectsList.innerHTML = '<p class="text-muted">프로젝트가 없습니다.</p>';
            return;
        }
        
        projectsList.innerHTML = projects.map(project => `
            <div class="card mb-3">
                <div class="card-body">
                    <h5 class="card-title">
                        <a href="/projects/${project.id}" class="text-decoration-none">${project.title}</a>
                    </h5>
                    <p class="card-text">${project.description}</p>
                    <p class="card-text">
                        <small class="text-muted">
                            작성자: ${project.author_name || '익명'} | 
                            작성일: ${new Date(project.created_at).toLocaleDateString()}
                        </small>
                    </p>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('projects-list').innerHTML = 
            '<div class="alert alert-danger">프로젝트를 불러오는데 실패했습니다.</div>';
    }
}

// 프로젝트 상세 표시
async function displayProject(projectId) {
    try {
        const response = await fetch(`/api/projects/${projectId}`);
        
        if (!response.ok) {
            throw new Error('프로젝트를 불러오는데 실패했습니다.');
        }
        
        const project = await response.json();
        const projectDetail = document.getElementById('project-detail');
        
        projectDetail.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <h2 class="card-title">${project.title}</h2>
                    <p class="text-muted mb-4">
                        작성자: ${project.author_name || '익명'} | 
                        작성일: ${new Date(project.created_at).toLocaleDateString()}
                    </p>
                    <div class="card-text mb-4">
                        ${project.description}
                    </div>
                    ${getCurrentUserId() === project.author_id ? `
                        <div class="btn-group">
                            <button class="btn btn-primary" onclick="editProject(${project.id})">수정</button>
                            <button class="btn btn-danger" onclick="deleteProject(${project.id})">삭제</button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('project-detail').innerHTML = 
            '<div class="alert alert-danger">프로젝트를 불러오는데 실패했습니다.</div>';
    }
}

// 새 게시글 작성 페이지
async function newBlogPostPage() {
    const mainContent = document.getElementById('main-content');
    const user = getCurrentUser();
    
    if (!user) {
        router.navigate('/login');
        return;
    }
    
    mainContent.innerHTML = `
        <div class="container mt-4">
            <div class="card">
                <div class="card-body">
                    <h2 class="card-title mb-4">새 게시글 작성</h2>
                    <form id="new-post-form">
                        <div class="mb-3">
                            <label for="title" class="form-label">제목</label>
                            <input type="text" class="form-control" id="title" required>
                        </div>
                        <div class="mb-3">
                            <label for="content" class="form-label">내용</label>
                            <textarea class="form-control" id="content" rows="10" required></textarea>
                        </div>
                        <div class="d-flex justify-content-between">
                            <a href="/blog" class="btn btn-secondary">취소</a>
                            <button type="submit" class="btn btn-primary">게시하기</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    // 폼 제출 이벤트 리스너
    const form = document.getElementById('new-post-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const title = document.getElementById('title').value;
            const content = document.getElementById('content').value;
            
            try {
                const response = await fetch('/api/blog/posts', {
                    method: 'POST',
                    headers: {
                        ...getAuthHeaders(),
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ title, content })
                });
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => null);
                    throw new Error(errorData?.message || '게시글 작성에 실패했습니다.');
                }
                
                const post = await response.json();
                showAlert('게시글이 작성되었습니다.', 'success');
                router.navigate(`/blog/${post.id}`);
            } catch (error) {
                console.error('Error:', error);
                showAlert(error.message, 'danger');
            }
        });
    }
}

// 새 프로젝트 페이지
async function newProjectPage() {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
        <div class="container mt-4">
            <h2 class="mb-4">새 프로젝트 생성</h2>
            <div class="card">
                <div class="card-body">
                    <form id="project-form" onsubmit="submitProject(event)">
                        <div class="mb-3">
                            <label for="title" class="form-label">제목</label>
                            <input type="text" class="form-control" id="title" name="title" required>
                        </div>
                        <div class="mb-3">
                            <label for="description" class="form-label">설명</label>
                            <textarea class="form-control" id="description" name="description" rows="5" required></textarea>
                        </div>
                        <div class="mb-3">
                            <label for="requirements" class="form-label">요구사항</label>
                            <textarea class="form-control" id="requirements" name="requirements" rows="10"></textarea>
                        </div>
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label for="start_date" class="form-label">시작일</label>
                                <input type="date" class="form-control" id="start_date" name="start_date" required>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label for="end_date" class="form-label">종료일</label>
                                <input type="date" class="form-control" id="end_date" name="end_date" required>
                            </div>
                        </div>
                        <div class="mb-3">
                            <label for="status" class="form-label">상태</label>
                            <select class="form-select" id="status" name="status" required>
                                <option value="open">모집 중</option>
                                <option value="in_progress">진행 중</option>
                                <option value="completed">완료</option>
                            </select>
                        </div>
                        <div class="d-flex justify-content-between">
                            <a href="/projects" class="btn btn-secondary">취소</a>
                            <button type="submit" class="btn btn-primary">생성</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
}

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
        await router.loadContent();
        
        // 브라우저 뒤로가기/앞으로가기 처리
        window.addEventListener('popstate', () => {
            router.loadContent();
        });
    } catch (error) {
        console.error('Initialization error:', error);
    }
}); 