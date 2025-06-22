const blog = {
    showBlogPage: async function() {
        document.getElementById('main-content').innerHTML = `
            <div class="container mt-4">
                <h1 class="mb-4">블로그</h1>
                <div id="posts-container" class="row"></div>
            </div>
        `;
        // ... 기존 showBlogPage 함수 내용은 그대로 ...
    },

    showNewPostForm: function() {
        // ... 기존 showNewPostForm 함수 내용은 그대로 ...
    },

    showEditPostForm: async function(postId) {
        // ... 기존 showEditPostForm 함수 내용은 그대로 ...
    },

    showPostDetail: async function(postId) {
        // ... 기존 showPostDetail 함수 내용은 그대로 ...
    },

    loadRecentPosts: async function() {
        try {
            const response = await fetch('/api/blog');
            if (!response.ok) {
                throw new Error('최신 게시글을 불러오는데 실패했습니다.');
            }
            const posts = await response.json();
            const container = document.getElementById('recent-posts-container');
            if (!container) return;

            if (posts.length === 0) {
                container.innerHTML = '<p>아직 게시글이 없습니다.</p>';
                return;
            }

            // Slice to get the most recent posts, e.g., latest 3
            const recentPosts = posts.slice(0, 3);

            container.innerHTML = `
                <h2 class="mt-5 mb-3">최신 글</h2>
                <div class="row">
                    ${recentPosts.map(post => `
                        <div class="col-md-4 mb-4">
                            <div class="card h-100">
                                <div class="card-body d-flex flex-column">
                                    <h5 class="card-title">${post.title}</h5>
                                    <p class="card-text text-muted small">${new Date(post.created_at).toLocaleDateString()}</p>
                                    <p class="card-text flex-grow-1">${post.content.substring(0, 100)}...</p>
                                    <a href="#/blog/${post.id}" class="btn btn-primary mt-auto">더 읽기</a>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (error) {
            console.error(error);
            const container = document.getElementById('recent-posts-container');
            if(container) {
                container.innerHTML = '<p class="text-danger">게시글을 불러오는 중 오류가 발생했습니다.</p>';
            }
        }
    }

    // home 함수 및 DOMContentLoaded, 라우터 관련 코드 모두 삭제됨
}; 