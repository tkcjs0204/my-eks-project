// 블로그 포스트 삭제
async function deletePost(postId) {
    if (!confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('로그인이 필요합니다.');
        }

        const response = await fetch(`/api/blog/posts/${postId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '게시물 삭제에 실패했습니다.');
        }
        
        showAlert('게시물이 삭제되었습니다.', 'success');
        window.location.href = '/blog';
    } catch (error) {
        console.error('Error:', error);
        showAlert(error.message, 'danger');
    }
}

// 댓글 작성
async function submitComment(event, postId) {
    event.preventDefault();
    
    const content = document.getElementById('comment-content').value.trim();
    if (!content) {
        showAlert('댓글 내용을 입력해주세요.', 'danger');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('로그인이 필요합니다.');
        }

        const response = await fetch(`/api/blog/posts/${postId}/comments`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '댓글 작성에 실패했습니다.');
        }
        
        // 댓글 입력창 초기화
        document.getElementById('comment-content').value = '';
        
        // 댓글 목록 새로고침
        await loadBlogComments(postId);
        
        showAlert('댓글이 작성되었습니다.', 'success');
    } catch (error) {
        console.error('Error:', error);
        showAlert(error.message, 'danger');
    }
}

// 블로그 포스트 목록 로드
async function loadPosts() {
    try {
        const response = await fetch('/api/blog/posts', {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error('포스트를 불러오는데 실패했습니다.');
        }
        
        const posts = await response.json();
        displayPosts(posts);
    } catch (error) {
        console.error('Error:', error);
        showAlert(error.message, 'danger');
    }
}

// 블로그 포스트 목록 표시
function displayPosts(posts) {
    const mainContent = document.getElementById('main-content');
    
    if (!posts || posts.length === 0) {
        mainContent.innerHTML = '<div class="alert alert-info">아직 작성된 게시글이 없습니다.</div>';
        return;
    }

    const postsHTML = posts.map(post => `
        <div class="card mb-4">
            <div class="card-body">
                <h5 class="card-title">${post.title}</h5>
                <h6 class="card-subtitle mb-2 text-muted">
                    작성자: ${post.author_name} | 
                    작성일: ${new Date(post.created_at).toLocaleDateString()} |
                    좋아요: ${post.like_count || 0} | 
                    댓글: ${post.comment_count || 0}
                </h6>
                <p class="card-text">${post.content.substring(0, 200)}...</p>
                <div class="d-flex justify-content-between align-items-center">
                    <div class="btn-group">
                        <a href="/blog/${post.id}" class="btn btn-sm btn-outline-primary">자세히 보기</a>
                        ${post.author_id === getCurrentUserId() ? `
                            <a href="/blog/${post.id}/edit" class="btn btn-sm btn-outline-secondary">수정</a>
                            <button onclick="deletePost(${post.id})" class="btn btn-sm btn-outline-danger">삭제</button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    mainContent.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2>블로그</h2>
            <a href="/blog/new" class="btn btn-primary">새 게시글 작성</a>
        </div>
        ${postsHTML}
    `;
}

// 블로그 포스트 상세 정보 로드
async function loadPost(postId) {
    try {
        const response = await fetch(`/api/blog/posts/${postId}`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || '게시글을 불러오는데 실패했습니다.');
        }
        
        const post = await response.json();
        if (!post) {
            throw new Error('게시글을 찾을 수 없습니다.');
        }
        
        await displayPost(postId);
    } catch (error) {
        console.error('Error:', error);
        showAlert(error.message, 'danger');
    }
}

// 블로그 포스트 상세 정보 표시
async function displayPost(postId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('로그인이 필요합니다.');
        }

        const response = await fetch(`/api/blog/posts/${postId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '게시물을 불러오는데 실패했습니다.');
        }
        
        const post = await response.json();
        const mainContent = document.getElementById('main-content');
        const currentUser = JSON.parse(localStorage.getItem('user'));
        
        mainContent.innerHTML = `
            <div class="container mt-4">
                <div class="card">
                    <div class="card-body">
                        <h2 class="card-title">${post.title}</h2>
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <small class="text-muted">
                                작성자: ${post.author_name || '익명'} | 
                                작성일: ${new Date(post.created_at).toLocaleDateString()}
                            </small>
                            ${post.author_id === currentUser.id ? `
                                <div>
                                    <a href="/blog/${post.id}/edit" class="btn btn-primary btn-sm">수정</a>
                                    <button onclick="deleteBlogPost(${post.id})" class="btn btn-danger btn-sm">삭제</button>
                                </div>
                            ` : ''}
                        </div>
                        <div class="card-text">${post.content}</div>
                    </div>
                </div>
                
                <div class="mt-4">
                    <h4>댓글</h4>
                    <div id="comments-list"></div>
                    
                    <form id="comment-form" class="mt-3">
                        <div class="mb-3">
                            <textarea class="form-control" id="comment-content" rows="3" placeholder="댓글을 작성하세요..."></textarea>
                        </div>
                        <button type="submit" class="btn btn-primary">댓글 작성</button>
                    </form>
                </div>
            </div>
        `;
        
        // 댓글 목록 로드
        await loadBlogComments(postId);
        
        // 댓글 작성 폼 이벤트 리스너
        const commentForm = document.getElementById('comment-form');
        if (commentForm) {
            commentForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const content = document.getElementById('comment-content').value;
                if (!content.trim()) {
                    showAlert('댓글 내용을 입력해주세요.', 'warning');
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
                        const errorData = await response.json();
                        throw new Error(errorData.message || '댓글 작성에 실패했습니다.');
                    }
                    
                    document.getElementById('comment-content').value = '';
                    await loadBlogComments(postId);
                    showAlert('댓글이 작성되었습니다.', 'success');
                } catch (error) {
                    console.error('Error:', error);
                    showAlert(error.message, 'danger');
                }
            });
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert(error.message, 'danger');
    }
}

// 블로그 댓글 목록 로드
async function loadBlogComments(postId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('로그인이 필요합니다.');
        }

        const response = await fetch(`/api/blog/posts/${postId}/comments`, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || '댓글을 불러오는데 실패했습니다.');
        }
        
        const comments = await response.json();
        const commentsList = document.getElementById('comments-list');
        
        if (!commentsList) {
            console.error('Comments list element not found');
            return;
        }
        
        if (!comments || comments.length === 0) {
            commentsList.innerHTML = '<p class="text-muted text-center">댓글이 없습니다.</p>';
            return;
        }
        
        commentsList.innerHTML = comments.map(comment => `
            <div class="card mb-2" data-comment-id="${comment.id}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <h6 class="card-subtitle mb-2 text-muted">
                            ${comment.author_name || '익명'} | 
                            ${new Date(comment.created_at).toLocaleDateString()}
                        </h6>
                        ${getCurrentUserId() === comment.author_id ? `
                            <div class="btn-group">
                                <button class="btn btn-sm btn-outline-primary" onclick="editBlogComment(${comment.id})">수정</button>
                                <button class="btn btn-sm btn-outline-danger" onclick="deleteBlogComment(${postId}, ${comment.id})">삭제</button>
                            </div>
                        ` : ''}
                    </div>
                    <p class="card-text">${comment.content}</p>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error:', error);
        const commentsList = document.getElementById('comments-list');
        if (commentsList) {
            commentsList.innerHTML = `
                <div class="alert alert-danger">
                    ${error.message}
                </div>
            `;
        }
    }
}

// 블로그 댓글 수정
async function editBlogComment(commentId) {
    const newContent = prompt('수정할 내용을 입력하세요:');
    if (!newContent) return;

    try {
        const postId = document.querySelector('[data-post-id]').dataset.postId;
        const response = await fetch(`/api/blog/posts/${postId}/comments/${commentId}`, {
            method: 'PUT',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: newContent })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || '댓글 수정에 실패했습니다.');
        }

        await loadBlogComments(postId);
        showAlert('댓글이 수정되었습니다.', 'success');
    } catch (error) {
        console.error('Error:', error);
        showAlert(error.message, 'danger');
    }
}

// 블로그 댓글 삭제
async function deleteBlogComment(postId, commentId) {
    if (!confirm('정말로 이 댓글을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('로그인이 필요합니다.');
        }

        // postId가 제공되지 않은 경우 DOM에서 가져옴
        if (!postId) {
            const postIdElement = document.querySelector('[data-post-id]');
            if (postIdElement) {
                postId = postIdElement.dataset.postId;
            } else {
                throw new Error('게시물 ID를 찾을 수 없습니다.');
            }
        }
        
        console.log(`댓글 삭제 요청: /api/blog/posts/${postId}/comments/${commentId}`);
        
        const response = await fetch(`/api/blog/posts/${postId}/comments/${commentId}`, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '댓글 삭제에 실패했습니다.');
        }
        
        // 댓글 목록 새로고침
        await loadBlogComments(postId);
        
        showAlert('댓글이 삭제되었습니다.', 'success');
    } catch (error) {
        console.error('Error:', error);
        showAlert(error.message, 'danger');
    }
}

// 좋아요 처리
async function handleLike(postId) {
    try {
        const response = await fetchAPI(`/api/blog/${postId}/like`, {
            method: 'POST'
        });
        showSuccess(response.message);
        loadPost(postId);
    } catch (error) {
        showError('좋아요 처리에 실패했습니다.');
    }
}

// 댓글 작성 처리
async function handleCommentSubmit(event, postId) {
    event.preventDefault();
    
    const form = event.target;
    const content = form.querySelector('textarea').value.trim();
    
    if (!content) {
        showAlert('댓글 내용을 입력해주세요.', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`/api/blog/posts/${postId}/comments`, {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || '댓글 작성에 실패했습니다.');
        }
        
        showAlert('댓글이 작성되었습니다.', 'success');
        form.reset();
        await loadBlogComments(postId);
    } catch (error) {
        console.error('Error:', error);
        showAlert(error.message, 'danger');
    }
}

// 블로그 포스트 작성 폼 표시
function showPostForm(post = null) {
    const mainContent = document.getElementById('main-content');
    const isEdit = !!post;
    
    mainContent.innerHTML = `
        <div class="container">
            <h2 class="mb-4">${isEdit ? '게시글 수정' : '새 게시글 작성'}</h2>
            <form id="postForm" onsubmit="submitPost(event, ${post ? post.id : 'null'})">
                <div class="mb-3">
                    <label class="form-label">제목</label>
                    <input type="text" class="form-control" id="title" name="title" value="${post ? post.title : ''}" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">내용</label>
                    <textarea class="form-control" id="content" name="content" rows="10" required>${post ? post.content : ''}</textarea>
                </div>
                <div class="mb-3">
                    <label class="form-label">태그 (쉼표로 구분)</label>
                    <input type="text" class="form-control" id="tags" name="tags" value="${post ? post.tags : ''}" placeholder="예: 기술, 프로그래밍, 웹개발">
                </div>
                <div class="d-flex gap-2">
                    <button type="submit" class="btn btn-primary">${isEdit ? '수정하기' : '작성하기'}</button>
                    <button type="button" class="btn btn-secondary" onclick="router.navigate('/blog')">취소</button>
                </div>
            </form>
        </div>
    `;
}

// 게시글 작성/수정 제출
async function submitPost(event, postId = null) {
    event.preventDefault();
    
    const title = document.getElementById('title').value;
    const content = document.getElementById('content').value;
    const tags = document.getElementById('tags').value.split(',').map(tag => tag.trim()).filter(tag => tag);
    
    try {
        const url = postId ? `/api/blog/posts/${postId}` : '/api/blog/posts';
        const method = postId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: getAuthHeaders(),
            body: JSON.stringify({ title, content, tags })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || '게시글 저장에 실패했습니다.');
        }
        
        showAlert(postId ? '게시글이 수정되었습니다.' : '게시글이 작성되었습니다.', 'success');
        router.navigate(postId ? `/blog/${postId}` : '/blog');
    } catch (error) {
        console.error('Error:', error);
        showAlert(error.message || '게시글 저장에 실패했습니다.', 'danger');
    }
}

// 에러 메시지 표시
function showError(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.querySelector('.container').prepend(alertDiv);
}

// 성공 메시지 표시
function showSuccess(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.querySelector('.container').prepend(alertDiv);
}

// 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', () => {
    // 블로그 포스트 작성 폼 제출 이벤트
    const blogForm = document.getElementById('blog-form');
    if (blogForm) {
        blogForm.addEventListener('submit', handleBlogSubmit);
    }
});

// 현재 로그인한 사용자 ID 가져오기
function getCurrentUserId() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.id;
    } catch (error) {
        console.error('Error parsing token:', error);
        return null;
    }
}

// 알림 표시
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const mainContent = document.getElementById('main-content');
    mainContent.insertBefore(alertDiv, mainContent.firstChild);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// 좋아요 토글
async function togglePostLike(postId) {
    try {
        const response = await fetch(`/api/blog/posts/${postId}/like`, {
            method: 'POST',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('좋아요 처리에 실패했습니다.');
        }

        const result = await response.json();
        const likeButton = document.querySelector(`button[onclick="togglePostLike(${postId})"]`);
        const likeCount = document.getElementById('like-count');
        
        if (likeButton && likeCount) {
            const heartIcon = likeButton.querySelector('i');
            heartIcon.classList.toggle('text-danger', result.is_liked);
            heartIcon.classList.toggle('text-muted', !result.is_liked);
            
            // 좋아요 수 업데이트
            const currentCount = parseInt(likeCount.textContent);
            likeCount.textContent = result.is_liked ? currentCount + 1 : currentCount - 1;
        }
        
        showAlert(result.message, 'success');
    } catch (error) {
        console.error('Error:', error);
        showAlert(error.message, 'danger');
    }
}

// 인증 헤더 가져오기
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No token found in localStorage');
        return {};
    }
    
    return {
        'Authorization': `Bearer ${token}`
    };
}

// 새 게시글 작성
async function createPost(event) {
    event.preventDefault();
    
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
}

// 게시글 수정
async function editPost(postId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('로그인이 필요합니다.');
        }

        const response = await fetch(`/api/blog/posts/${postId}`, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '게시글을 불러오는데 실패했습니다.');
        }
        
        const post = await response.json();
        
        // 게시글 수정 폼으로 이동
        window.location.href = `/blog/${postId}/edit`;
    } catch (error) {
        console.error('Error:', error);
        showAlert(error.message, 'danger');
    }
}

// 게시글 수정 페이지
async function editPostPage(postId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('로그인이 필요합니다.');
        }

        const response = await fetch(`/api/blog/posts/${postId}`, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '게시글을 불러오는데 실패했습니다.');
        }
        
        const post = await response.json();
        
        const mainContent = document.getElementById('main-content');
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
                                <textarea class="form-control" id="content" rows="10" required>${post.content}</textarea>
                            </div>
                            <div class="d-flex justify-content-between">
                                <a href="/blog/${postId}" class="btn btn-secondary">취소</a>
                                <button type="submit" class="btn btn-primary">수정하기</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        // 폼 제출 이벤트 리스너
        const form = document.getElementById('edit-post-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const title = document.getElementById('title').value;
                const content = document.getElementById('content').value;
                
                try {
                    const response = await fetch(`/api/blog/posts/${postId}`, {
                        method: 'PUT',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ title, content })
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || '게시글 수정에 실패했습니다.');
                    }
                    
                    showAlert('게시글이 수정되었습니다.', 'success');
                    window.location.href = `/blog/${postId}`;
                } catch (error) {
                    console.error('Error:', error);
                    showAlert(error.message, 'danger');
                }
            });
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert(error.message, 'danger');
    }
}

// 프로젝트 댓글 목록 로드
async function loadProjectComments(projectId) {
    try {
        const response = await fetch(`/api/projects/${projectId}/comments`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || '댓글을 불러오는데 실패했습니다.');
        }
        
        const comments = await response.json();
        const commentsList = document.getElementById('project-comments-list');
        
        if (!commentsList) {
            console.error('Project comments list element not found');
            return;
        }
        
        if (!comments || comments.length === 0) {
            commentsList.innerHTML = '<p class="text-muted text-center">댓글이 없습니다.</p>';
            return;
        }
        
        commentsList.innerHTML = comments.map(comment => `
            <div class="card mb-2" data-comment-id="${comment.id}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <h6 class="card-subtitle mb-2 text-muted">${comment.author_name}</h6>
                            <p class="card-text comment-content">${comment.content}</p>
                            <small class="text-muted">${new Date(comment.created_at).toLocaleString()}</small>
                        </div>
                        ${comment.author_id === getCurrentUserId() ? `
                            <div class="btn-group ms-2">
                                <button class="btn btn-sm btn-outline-primary" onclick="editProjectComment(${projectId}, ${comment.id})">
                                    수정
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="deleteProjectComment(${projectId}, ${comment.id})">
                                    삭제
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error:', error);
        const commentsList = document.getElementById('project-comments-list');
        if (commentsList) {
            commentsList.innerHTML = `
                <div class="alert alert-danger">
                    ${error.message}
                </div>
            `;
        }
    }
}

// 프로젝트 댓글 삭제
async function deleteProjectComment(projectId, commentId) {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;
    
    try {
        const response = await fetch(`/api/projects/${projectId}/comments/${commentId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error('댓글 삭제에 실패했습니다.');
        }
        
        loadProjectComments(projectId);
    } catch (error) {
        console.error('Error:', error);
        showAlert(error.message, 'danger');
    }
}

// 블로그 게시물 삭제
async function deleteBlogPost(postId) {
    if (!confirm('정말로 이 게시물을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('로그인이 필요합니다.');
        }

        const response = await fetch(`/api/blog/posts/${postId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '게시물 삭제에 실패했습니다.');
        }
        
        showAlert('게시물이 삭제되었습니다.', 'success');
        window.location.href = '/blog';
    } catch (error) {
        console.error('Error:', error);
        showAlert(error.message, 'danger');
    }
}

// Make deleteComment available globally
async function deleteComment(postId, commentId) {
    // postId는 무시하고 commentId만 사용
    return deleteBlogComment(postId, commentId);
} 