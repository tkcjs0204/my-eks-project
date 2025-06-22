const blog = {
    showBlogPage: async function() {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="container mt-4">
                <h1 class="mb-4">블로그</h1>
                <div id="posts-container" class="row"></div>
            </div>
        `;
        try {
            const response = await fetch('/api/posts');
            const posts = await response.json();
            const container = document.getElementById('posts-container');
            if (posts.length === 0) {
                container.innerHTML = '<p>게시글이 없습니다.</p>';
            } else {
                container.innerHTML = posts.map(post => `
                    <div class="col-md-6 mb-4">
                        <div class="card">
                            <div class="card-body">
                                <h5 class="card-title">${post.title}</h5>
                                <p class="card-text">${post.content.substring(0, 100)}...</p>
                                <a href="#/blog/${post.id}" class="btn btn-primary">더 보기</a>
                            </div>
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('블로그 게시글 로딩 오류:', error);
            document.getElementById('posts-container').innerHTML = '<p>게시글을 불러오는 데 실패했습니다.</p>';
        }
    },

    showNewPostForm: function() {
        // ... 기존 showNewPostForm 함수 내용은 그대로 ...
    },

    showEditPostForm: async function(postId) {
        // ... 기존 showEditPostForm 함수 내용은 그대로 ...
    },

    showPostDetail: async function(postId) {
        try {
            const response = await fetch(`/api/posts/${postId}`);
            const post = await response.json();
            // ... 기존 showPostDetail 함수 내용은 그대로 ...
        } catch (error) {
            console.error('게시글 상세 정보 로딩 오류:', error);
            document.getElementById('main-content').innerHTML = '<p>게시글을 불러오는 데 실패했습니다.</p>';
        }
    },

    loadRecentPosts: async function() {
        try {
            const response = await fetch('/api/posts');
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