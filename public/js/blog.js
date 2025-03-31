// 블로그 포스트 삭제
async function deletePost(postId) {
    if (!confirm('정말로 이 글을 삭제하시겠습니까?')) {
        return;
    }

    try {
        const response = await fetch(`/blog/${postId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('삭제에 실패했습니다.');
        }

        window.location.href = '/blog';
    } catch (error) {
        alert(error.message);
    }
}

// 댓글 작성
async function submitComment(postId) {
    const content = document.getElementById('commentContent').value.trim();
    if (!content) {
        alert('댓글 내용을 입력해주세요.');
        return;
    }

    try {
        const response = await fetch(`/blog/${postId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ content })
        });

        if (!response.ok) {
            throw new Error('댓글 작성에 실패했습니다.');
        }

        window.location.reload();
    } catch (error) {
        alert(error.message);
    }
}

// 댓글 삭제
async function deleteComment(postId, commentId) {
    if (!confirm('정말로 이 댓글을 삭제하시겠습니까?')) {
        return;
    }

    try {
        const response = await fetch(`/blog/${postId}/comments/${commentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('댓글 삭제에 실패했습니다.');
        }

        window.location.reload();
    } catch (error) {
        alert(error.message);
    }
}

// 블로그 포스트 목록 로드
async function loadPosts() {
    try {
        const response = await fetch('/api/blog', {
            headers: addAuthHeader()
        });
        
        if (!response.ok) {
            throw new Error('포스트를 불러오는데 실패했습니다.');
        }
        
        const posts = await response.json();
        displayPosts(posts);
    } catch (error) {
        console.error('Error:', error);
        showError('포스트를 불러오는데 실패했습니다.');
    }
}

// 블로그 포스트 목록 표시
function displayPosts(posts) {
    const mainContent = document.querySelector('main');
    if (!mainContent) return;
    
    let html = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2>블로그 포스트</h2>
            <button class="btn btn-primary" onclick="router.navigate('/blog/new')">
                <i class="fas fa-plus me-1"></i>새 포스트
            </button>
        </div>
        <div class="row row-cols-1 row-cols-md-2 g-4">
    `;
    
    if (posts.length === 0) {
        html += `
            <div class="col">
                <div class="alert alert-info">
                    아직 작성된 포스트가 없습니다.
                </div>
            </div>
        `;
    } else {
        posts.forEach(post => {
            html += `
                <div class="col">
                    <div class="card h-100">
                        <div class="card-body">
                            <h5 class="card-title">
                                <a href="/blog/${post.id}" class="text-decoration-none text-dark">
                                    ${post.title}
                                </a>
                            </h5>
                            <p class="card-text text-muted small">
                                <i class="fas fa-user me-1"></i>${post.author_name} · 
                                <i class="fas fa-clock me-1"></i>${formatDate(post.created_at)}
                            </p>
                            <p class="card-text">
                                ${post.content.length > 200 ? post.content.substring(0, 200) + '...' : post.content}
                            </p>
                        </div>
                        <div class="card-footer bg-transparent">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <span class="me-3">
                                        <i class="fas fa-heart text-danger me-1"></i>${post.like_count || 0}
                                    </span>
                                    <span>
                                        <i class="fas fa-comment text-primary me-1"></i>${post.comment_count || 0}
                                    </span>
                                </div>
                                <a href="/blog/${post.id}" class="btn btn-outline-primary btn-sm">
                                    자세히 보기
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    html += `</div>`;
    mainContent.innerHTML = html;
}

// 블로그 포스트 상세 정보 로드
async function loadPost(postId) {
    try {
        const post = await fetchAPI(`/api/blog/${postId}`);
        displayPost(post);
        loadComments(postId);
    } catch (error) {
        showError('포스트를 불러오는데 실패했습니다.');
    }
}

// 블로그 포스트 상세 정보 표시
function displayPost(post) {
    const mainContent = document.querySelector('main');
    if (!mainContent) return;
    
    const html = `
        <article class="blog-post">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h1>${post.title}</h1>
                <div class="btn-group">
                    <button class="btn btn-outline-primary" onclick="handleLike(${post.id})">
                        <i class="fas fa-heart me-1"></i>좋아요 ${post.like_count || 0}
                    </button>
                    ${post.author_id === (window.user?.id || null) ? `
                        <button class="btn btn-outline-secondary" onclick="router.navigate('/blog/${post.id}/edit')">
                            <i class="fas fa-edit me-1"></i>수정
                        </button>
                        <button class="btn btn-outline-danger" onclick="handleDelete(${post.id})">
                            <i class="fas fa-trash me-1"></i>삭제
                        </button>
                    ` : ''}
                </div>
            </div>
            
            <div class="mb-3">
                <span class="me-3">
                    <i class="fas fa-user me-1"></i>${post.author_name}
                </span>
                <span>
                    <i class="fas fa-clock me-1"></i>${formatDate(post.created_at)}
                </span>
            </div>
            
            <div class="blog-content mb-5">
                ${marked.parse(post.content)}
            </div>
            
            <hr>
            
            <div class="comments-section">
                <h3 class="mb-4">댓글</h3>
                <div id="comments"></div>
                
                <form id="commentForm" class="mt-4" onsubmit="handleCommentSubmit(event, ${post.id})">
                    <div class="mb-3">
                        <textarea class="form-control" name="content" rows="3" placeholder="댓글을 작성하세요..." required></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary">
                        댓글 작성
                    </button>
                </form>
            </div>
        </article>
    `;
    
    mainContent.innerHTML = html;
    Prism.highlightAll();
}

// 댓글 목록 로드
async function loadComments(postId) {
    try {
        const comments = await fetchAPI(`/api/blog/${postId}/comments`);
        displayComments(comments);
    } catch (error) {
        showError('댓글을 불러오는데 실패했습니다.');
    }
}

// 댓글 목록 표시
function displayComments(comments) {
    const commentsContainer = document.getElementById('comments');
    if (!commentsContainer) return;
    
    if (comments.length === 0) {
        commentsContainer.innerHTML = `
            <div class="alert alert-info">
                아직 작성된 댓글이 없습니다.
            </div>
        `;
        return;
    }
    
    let html = '';
    comments.forEach(comment => {
        html += `
            <div class="comment mb-3">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <strong>${comment.author_name}</strong>
                        <small class="text-muted ms-2">
                            ${formatDate(comment.created_at)}
                        </small>
                    </div>
                    ${comment.author_id === (window.user?.id || null) ? `
                        <button class="btn btn-sm btn-outline-danger" onclick="handleCommentDelete(${comment.post_id}, ${comment.id})">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </div>
                <p class="mb-0 mt-2">${comment.content}</p>
            </div>
        `;
    });
    
    commentsContainer.innerHTML = html;
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
    const formData = new FormData(form);
    
    try {
        const response = await fetchAPI(`/api/blog/${postId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: formData.get('content')
            })
        });
        
        showSuccess(response.message);
        form.reset();
        loadComments(postId);
    } catch (error) {
        showError('댓글 작성에 실패했습니다.');
    }
}

// 댓글 삭제 처리
async function handleCommentDelete(postId, commentId) {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;
    
    try {
        const response = await fetchAPI(`/api/blog/${postId}/comments/${commentId}`, {
            method: 'DELETE'
        });
        
        showSuccess(response.message);
        loadComments(postId);
    } catch (error) {
        showError('댓글 삭제에 실패했습니다.');
    }
}

// 블로그 포스트 작성 처리
async function handleBlogSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    try {
        const response = await fetch('/api/blog', {
            method: 'POST',
            headers: {
                ...addAuthHeader(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: formData.get('title'),
                content: formData.get('content')
            })
        });
        
        if (!response.ok) {
            throw new Error('포스트 작성에 실패했습니다.');
        }
        
        const data = await response.json();
        showSuccess(data.message);
        router.navigate(`/blog/${data.postId}`);
    } catch (error) {
        console.error('Error:', error);
        showError('포스트 작성에 실패했습니다.');
    }
}

// 블로그 포스트 삭제 처리
async function handleDelete(postId) {
    if (!confirm('포스트를 삭제하시겠습니까?')) return;
    
    try {
        const response = await fetchAPI(`/api/blog/${postId}`, {
            method: 'DELETE'
        });
        
        showSuccess(response.message);
        router.navigate('/blog');
    } catch (error) {
        showError('포스트 삭제에 실패했습니다.');
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