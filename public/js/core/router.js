// 라우터 초기화
window.router = {
    routes: {},
    
    addRoute(path, handler) {
        this.routes[path] = handler;
    },
    
    async handleRoute() {
        try {
            const path = window.location.pathname;
            const handler = this.routes[path];
            
            if (handler) {
                await handler();
            } else {
                // 404 처리
                const mainContent = document.querySelector('#main-content');
                if (mainContent) {
                    mainContent.innerHTML = '<h1>페이지를 찾을 수 없습니다.</h1>';
                }
            }
        } catch (error) {
            console.error('Route handling error:', error);
            const mainContent = document.querySelector('#main-content');
            if (mainContent) {
                mainContent.innerHTML = '<div class="alert alert-danger">페이지 로드 중 오류가 발생했습니다.</div>';
            }
        }
    },
    
    navigate(path) {
        window.history.pushState({}, '', path);
        this.handleRoute();
    }
};

// 브라우저 뒤로가기/앞으로가기 처리
window.addEventListener('popstate', () => {
    if (window.router) {
        window.router.handleRoute();
    }
});

// 초기 라우트 처리
document.addEventListener('DOMContentLoaded', () => {
    window.router.handleRoute();
}); 