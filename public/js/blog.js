const blog = {
    // 페이지 전환을 위한 헬퍼 함수
    _showView(viewId) {
        document.getElementById('main-content').style.display = 'none';
        document.getElementById('form-container').style.display = 'none';
        document.getElementById('blog-post-detail').style.display = 'none';
        
        const view = document.getElementById(viewId);
        if(view) {
            view.style.display = 'block';
        } else {
            document.getElementById('main-content').style.display = 'block'; // Fallback
        }
    },

    async showBlogPage() {
        this._showView('main-content');
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h1>블로그</h1>
                <button id="new-post-btn" class="btn btn-primary">새 글 작성</button>
            </div>
            <div id="posts-container" class="row"></div>
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

    showNewPostForm() {
        this._showView('form-container');
        document.getElementById('form-container').innerHTML = `
            <h2>새 글 작성</h2>
            <form id="new-post-form">
                <div class="mb-3">
                    <label for="post-title" class="form-label">제목</label>
                    <input type="text" class="form-control" id="post-title" required>
                </div>
                <div class="mb-3">
                    <label for="post-content" class="form-label">내용</label>
                    <textarea class="form-control" id="post-content" rows="10" required></textarea>
                </div>
                <button type="submit" class="btn btn-primary">저장</button>
                <button type="button" id="cancel-btn" class="btn btn-secondary">취소</button>
            </form>
        `;
    },

    async showEditPostForm(postId) {
        this._showView('form-container');
        try {
            const response = await fetch(`/api/posts/${postId}`);
            if (!response.ok) throw new Error('게시글 정보를 불러올 수 없습니다.');
            const post = await response.json();

            document.getElementById('form-container').innerHTML = `
                <h2>게시글 수정</h2>
                <form id="edit-post-form" data-post-id="${post.id}">
                    <div class="mb-3">
                        <label for="post-title" class="form-label">제목</label>
                        <input type="text" class="form-control" id="post-title" value="${post.title}" required>
                    </div>
                    <div class="mb-3">
                        <label for="post-content" class="form-label">내용</label>
                        <textarea class="form-control" id="post-content" rows="10" required>${post.content}</textarea>
                    </div>
                    <button type="submit" class="btn btn-primary">수정</button>
                    <button type="button" id="cancel-btn" class="btn btn-secondary">취소</button>
                </form>
            `;
        } catch (error) {
            console.error('Error showing edit form:', error);
            alert('게시글 수정 폼을 불러오는 중 오류가 발생했습니다.');
            window.router.navigate('/blog');
        }
    },

    async showPostDetail(postId) {
        this._showView('blog-post-detail');
        try {
            const response = await fetch(`/api/posts/${postId}`);
            const post = await response.json();
            // ... 기존 showPostDetail 함수 내용은 그대로 ...
        } catch (error) {
            console.error('게시글 상세 정보 로딩 오류:', error);
            document.getElementById('main-content').innerHTML = '<p>게시글을 불러오는 데 실패했습니다.</p>';
        }
    },
    
    // --- 이벤트 핸들러 ---
    async handleNewPostSubmit(event) {
        event.preventDefault();
        const title = document.getElementById('post-title').value;
        const content = document.getElementById('post-content').value;

        try {
            const response = await fetch('/api/posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ title, content })
            });
            if (!response.ok) throw new Error('게시글 작성에 실패했습니다.');
            const newPost = await response.json();
            alert('게시글이 성공적으로 작성되었습니다.');
            window.router.navigate(`/blog/${newPost.id}`);
        } catch (error) {
            console.error('Error creating post:', error);
            alert(error.message);
        }
    },

    async handleEditPostSubmit(event) {
        event.preventDefault();
        const postId = event.target.dataset.postId;
        const title = document.getElementById('post-title').value;
        const content = document.getElementById('post-content').value;

        try {
            const response = await fetch(`/api/posts/${postId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ title, content })
            });
            if (!response.ok) throw new Error('게시글 수정에 실패했습니다.');
            alert('게시글이 성공적으로 수정되었습니다.');
            window.router.navigate(`/blog/${postId}`);
        } catch (error) {
            console.error('Error updating post:', error);
            alert(error.message);
        }
    },

    async handleDeletePost(postId) {
        if (!confirm('정말로 이 게시글을 삭제하시겠습니까?')) return;

        try {
            const response = await fetch(`/api/posts/${postId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (!response.ok) throw new Error('게시글 삭제에 실패했습니다.');
            alert('게시글이 삭제되었습니다.');
            window.router.navigate('/blog');
        } catch (error) {
            console.error('Error deleting post:', error);
            alert(error.message);
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
}; 