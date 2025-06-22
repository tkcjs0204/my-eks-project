document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content');

    const router = {
    routes: {
            '/': showHomePage,
            '/blog': blog.showBlogPage,
            '/blog/new': blog.showNewPostForm,
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
                    <h1 class="display-5 fw-bold">Note4U에 오신 것을 환영합니다</h1>
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
}); 