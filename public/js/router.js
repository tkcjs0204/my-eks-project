class Router {
    constructor(routes) {
        this.routes = routes;
        this.init();
    }
    
    init() {
        // 브라우저 뒤로가기/앞으로가기 처리
        window.addEventListener('popstate', () => {
            this.handleRoute();
        });
        
        // 링크 클릭 처리
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-link]') || e.target.closest('[data-link]')) {
                e.preventDefault();
                const link = e.target.matches('[data-link]') ? e.target : e.target.closest('[data-link]');
                this.navigate(link.href);
            }
        });
        
        // 초기 라우트 처리
        this.handleRoute();
    }
    
    async handleRoute() {
        const path = window.location.pathname;
        let matchedRoute = null;
        let params = {};
        
        // 라우트 매칭
        for (const route of this.routes) {
            const pattern = new RegExp('^' + route.path.replace(/:[^\s/]+/g, '([\\w-]+)') + '$');
            const match = path.match(pattern);
            
            if (match) {
                matchedRoute = route;
                
                // URL 파라미터 추출
                const paramNames = (route.path.match(/:[^\s/]+/g) || []).map(param => param.slice(1));
                params = paramNames.reduce((acc, param, i) => {
                    acc[param] = match[i + 1];
                    return acc;
                }, {});
                
                break;
            }
        }
        
        // 매칭된 라우트가 없으면 404 페이지 표시
        if (!matchedRoute) {
            matchedRoute = this.routes.find(route => route.path === '*');
        }
        
        // 라우트 핸들러 실행
        if (matchedRoute) {
            try {
                await matchedRoute.handler({ params });
            } catch (error) {
                console.error('Route handler error:', error);
                showError('페이지를 로드하는데 실패했습니다.');
            }
        }
    }
    
    navigate(url) {
        window.history.pushState(null, null, url);
        this.handleRoute();
    }
}

// 라우트 정의
const routes = [
    {
        path: '/',
        handler: async () => {
            const mainContent = document.querySelector('main');
            mainContent.innerHTML = `
                <div class="text-center py-5">
                    <h1 class="display-4 mb-4">Note4U에 오신 것을 환영합니다!</h1>
                    <p class="lead mb-5">당신의 지식과 경험을 공유하고, 다른 사람들과 소통하세요.</p>
                    <div class="row justify-content-center">
                        <div class="col-md-4">
                            <div class="card mb-4">
                                <div class="card-body text-center">
                                    <i class="fas fa-blog fa-3x text-primary mb-3"></i>
                                    <h3>블로그</h3>
                                    <p>당신의 생각과 경험을 블로그에 기록하세요.</p>
                                    <a href="/blog" class="btn btn-primary" data-link>
                                        블로그 보기
                                    </a>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card mb-4">
                                <div class="card-body text-center">
                                    <i class="fas fa-project-diagram fa-3x text-primary mb-3"></i>
                                    <h3>프로젝트</h3>
                                    <p>다른 개발자들과 함께 프로젝트를 진행하세요.</p>
                                    <a href="/project" class="btn btn-primary" data-link>
                                        프로젝트 보기
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    },
    {
        path: '/blog',
        handler: async () => {
            await loadPosts();
        }
    },
    {
        path: '/blog/new',
        handler: async () => {
            const mainContent = document.querySelector('main');
            mainContent.innerHTML = `
                <div class="container">
                    <h2 class="mb-4">새 블로그 포스트 작성</h2>
                    <form id="blogForm" onsubmit="handleBlogSubmit(event)">
                        <div class="mb-3">
                            <label class="form-label">제목</label>
                            <input type="text" class="form-control" name="title" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">내용</label>
                            <div class="row">
                                <div class="col-md-6">
                                    <textarea class="form-control" name="content" id="content" rows="20" required></textarea>
                                </div>
                                <div class="col-md-6">
                                    <div class="border rounded p-3" id="preview" style="min-height: 500px"></div>
                                </div>
                            </div>
                        </div>
                        <button type="submit" class="btn btn-primary">작성하기</button>
                        <button type="button" class="btn btn-secondary" onclick="router.navigate('/blog')">취소</button>
                    </form>
                </div>
            `;
        }
    },
    {
        path: '/blog/:id',
        handler: async ({ params }) => {
            await loadPost(params.id);
        }
    },
    {
        path: '/project',
        handler: async () => {
            const mainContent = document.querySelector('main');
            mainContent.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h2>프로젝트</h2>
                    <button class="btn btn-primary" onclick="router.navigate('/project/new')">
                        <i class="fas fa-plus me-1"></i>새 프로젝트
                    </button>
                </div>
                <div id="projects" class="row row-cols-1 row-cols-md-2 g-4">
                    <!-- 프로젝트 목록이 여기에 로드됩니다 -->
                </div>
            `;
            await loadProjects();
        }
    },
    {
        path: '*',
        handler: async () => {
            const mainContent = document.querySelector('main');
            mainContent.innerHTML = `
                <div class="text-center py-5">
                    <h1 class="display-1 text-muted">404</h1>
                    <p class="lead">페이지를 찾을 수 없습니다.</p>
                    <a href="/" class="btn btn-primary" data-link>홈으로 돌아가기</a>
                </div>
            `;
        }
    }
];

// 라우터 초기화
const router = new Router(routes);
window.router = router; 