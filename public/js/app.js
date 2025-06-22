document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content');

    const router = {
    routes: {
            '/': showHomePage,
            '/blog': () => blog.showBlogPage(),
            '/blog/new': () => blog.showNewPostForm(),
            '/blog/edit/:id': (params) => blog.showEditPostForm(params.id),
            '/blog/:id': (params) => blog.showPostDetail(params.id),
        },
        
        navigate: function(path) {
            window.location.hash = path;
        },

        handle: function() {
            const path = window.location.hash.substring(1) || '/';
            let match = null;
            let params = {};

            for (const route in this.routes) {
                const routeRegex = new RegExp(`^${route.replace(/:\w+/g, '([^/]+)')}$`);
                const potentialMatch = path.match(routeRegex);

                if (potentialMatch) {
                    match = this.routes[route];
                    const keys = route.match(/:\w+/g) || [];
                    keys.forEach((key, index) => {
                        params[key.substring(1)] = potentialMatch[index + 1];
                    });
                    break;
                }
            }

            if (match) {
                match(params);
        } else {
                mainContent.innerHTML = '<h1>404 - Page Not Found</h1>';
            }
        }
    };
    
    window.router = router;
    window.addEventListener('hashchange', () => router.handle());

    // Initial auth check and route handling
    auth.checkAuthStatus().then(() => {
        router.handle();
    });

    function showHomePage() {
    mainContent.innerHTML = `
            <div class="p-5 mb-4 bg-light rounded-3">
                <div class="container-fluid py-5">
                    <h1 class="display-5 fw-bold">이희찬 버스탐</h1>
                    <p class="col-md-8 fs-4">아이디어를 공유하고, 협업하고, 멋진 프로젝트를 만들어보세요.</p>
                    <a href="#/blog" class="btn btn-primary btn-lg">블로그 탐색하기</a>
                </div>
            </div>
            <div id="recent-posts-container">
                <!-- Recent posts can be loaded here by another function -->
        </div>
    `;
        blog.loadRecentPosts();
    }

    // 중앙 이벤트 리스너
    document.body.addEventListener('click', (event) => {
        // 새 글 작성 버튼
        if (event.target.matches('#new-post-btn')) {
            window.router.navigate('/blog/new');
        }

        // 취소 버튼
        if (event.target.matches('#cancel-btn')) {
            // 간단하게 뒤로 가기 처리
            history.back();
        }

        // 삭제 버튼 (상세보기 페이지 내)
        if (event.target.matches('#delete-post-btn')) {
            const postId = event.target.dataset.postId;
            if (postId) {
                blog.handleDeletePost(postId);
            }
        }
    });

    document.body.addEventListener('submit', (event) => {
        // 새 글 작성 폼 제출
        if (event.target.matches('#new-post-form')) {
            blog.handleNewPostSubmit(event);
        }

        // 글 수정 폼 제출
        if (event.target.matches('#edit-post-form')) {
            blog.handleEditPostSubmit(event);
        }

        // 로그인 폼 제출
        if (event.target.matches('#login-form')) {
            auth.handleLogin(event);
        }

        // 회원가입 폼 제출
        if (event.target.matches('#register-form')) {
            auth.handleRegister(event);
        }
    });
}); 