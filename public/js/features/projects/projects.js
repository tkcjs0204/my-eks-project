// 프로젝트 목록 표시
async function displayProjects() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('로그인이 필요합니다.');
        }

        const response = await fetch('/api/projects', {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '프로젝트를 불러오는데 실패했습니다.');
        }
        
        const projects = await response.json();
        const mainContent = document.getElementById('main-content');
        
        if (!Array.isArray(projects) || projects.length === 0) {
            mainContent.innerHTML = '<div class="alert alert-info">아직 생성된 프로젝트가 없습니다.</div>';
            return;
        }

        mainContent.innerHTML = `
            <div class="container mt-4">
                <h2>프로젝트 목록</h2>
                <div class="row">
                    ${projects.map(project => `
                        <div class="col-md-6 mb-4">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h5 class="card-title">${project.title}</h5>
                                    <p class="card-text">${project.description}</p>
                                    <div class="d-flex justify-content-between align-items-center">
                                        <small class="text-muted">
                                            작성자: ${project.author_name || '익명'} | 
                                            작성일: ${new Date(project.created_at).toLocaleDateString()}
                                        </small>
                                        <div>
                                            <a href="/projects/${project.id}" class="btn btn-primary btn-sm">자세히 보기</a>
                                            ${project.author_id === JSON.parse(localStorage.getItem('user')).id ? `
                                                <button onclick="deleteProject(${project.id})" class="btn btn-danger btn-sm">삭제</button>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error:', error);
        showAlert(error.message, 'danger');
    }
}

// 프로젝트 상세 정보 표시
async function displayProject(projectId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('로그인이 필요합니다.');
        }

        const response = await fetch(`/api/projects/${projectId}`, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '프로젝트를 불러오는데 실패했습니다.');
        }

        const project = await response.json();
        
        // 프로젝트 정보 표시
        document.getElementById('project-title').textContent = project.title;
        document.getElementById('project-description').textContent = project.description;
        document.getElementById('project-requirements').textContent = project.requirements;
        
        // 상태 표시
        const statusBadge = document.querySelector('.status-badge');
        statusBadge.textContent = getStatusText(project.status);
        statusBadge.className = `status-badge ${project.status}`;
        
        // 기간 표시
        const startDate = new Date(project.start_date).toLocaleDateString();
        const endDate = new Date(project.end_date).toLocaleDateString();
        document.getElementById('project-dates').textContent = `${startDate} ~ ${endDate}`;
        
        // 팀원 목록 표시
        const membersList = document.getElementById('project-members-list');
        membersList.innerHTML = '';
        project.members.forEach(member => {
            const memberItem = document.createElement('div');
            memberItem.className = 'member-item';
            memberItem.innerHTML = `
                <div class="member-avatar">${member.name.charAt(0)}</div>
                <div class="member-info">
                    <div class="member-name">${member.name}</div>
                    <div class="member-role">${member.role}</div>
                </div>
            `;
            membersList.appendChild(memberItem);
        });
        
        // 작업 목록 표시
        const tasksList = document.getElementById('project-tasks-list');
        tasksList.innerHTML = '';
        project.tasks.forEach(task => {
            const taskItem = document.createElement('div');
            taskItem.className = 'task-item';
            taskItem.innerHTML = `
                <div class="task-header">
                    <h5 class="task-title">${task.title}</h5>
                    <span class="task-status ${task.status}">${getTaskStatusText(task.status)}</span>
                </div>
                <div class="task-description">${task.description}</div>
                <div class="task-meta">
                    <div class="task-assignee">
                        <div class="task-assignee-avatar">${task.assignee.name.charAt(0)}</div>
                        <span>${task.assignee.name}</span>
                    </div>
                    <span>마감일: ${new Date(task.due_date).toLocaleDateString()}</span>
                </div>
            `;
            tasksList.appendChild(taskItem);
        });
        
        // 댓글 목록 표시
        const commentsList = document.getElementById('project-comments-list');
        commentsList.innerHTML = '';
        project.comments.forEach(comment => {
            const commentItem = document.createElement('div');
            commentItem.className = 'comment-item';
            commentItem.innerHTML = `
                <div class="comment-header">
                    <div class="comment-author">
                        <div class="comment-author-avatar">${comment.author.name.charAt(0)}</div>
                        <span>${comment.author.name}</span>
                    </div>
                    <small class="text-muted">${new Date(comment.created_at).toLocaleString()}</small>
                </div>
                <div class="comment-content">${comment.content}</div>
                <div class="comment-actions">
                    <button onclick="editComment(${comment.id})">수정</button>
                    <button onclick="deleteComment(${projectId}, ${comment.id})">삭제</button>
                </div>
            `;
            commentsList.appendChild(commentItem);
        });
        
        // 댓글 폼 이벤트 리스너
        const commentForm = document.getElementById('comment-form');
        commentForm.onsubmit = async (e) => {
            e.preventDefault();
            const content = document.getElementById('comment-content').value;
            if (!content.trim()) {
                showAlert('댓글 내용을 입력해주세요.', 'warning');
                return;
            }
            
            try {
                const response = await fetch(`/api/projects/${projectId}/comments`, {
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
                
                showAlert('댓글이 작성되었습니다.', 'success');
                document.getElementById('comment-content').value = '';
                // 댓글 목록 새로고침
                displayProject(projectId);
            } catch (error) {
                console.error('Error:', error);
                showAlert(error.message || '댓글 작성에 실패했습니다.', 'danger');
            }
        };
    } catch (error) {
        console.error('Error:', error);
        showAlert(error.message || '프로젝트를 불러오는데 실패했습니다.', 'danger');
        if (error.message === '로그인이 필요합니다.') {
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
        }
    }
}

// 프로젝트 작성/수정 폼 표시
function showProjectForm(project = null) {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
        <div class="card">
            <div class="card-body">
                <h2 class="card-title mb-4">${project ? '프로젝트 수정' : '새 프로젝트 생성'}</h2>
                <form onsubmit="submitProject(event, ${project ? project.id : 'null'})">
                    <div class="mb-3">
                        <label class="form-label">제목</label>
                        <input type="text" class="form-control" id="title" name="title" value="${project ? project.title : ''}" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">설명</label>
                        <textarea class="form-control" id="description" name="description" rows="5" required>${project ? project.description : ''}</textarea>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">요구사항</label>
                        <textarea class="form-control" id="requirements" name="requirements" rows="10" required>${project ? project.requirements : ''}</textarea>
                    </div>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label">시작일</label>
                            <input type="date" class="form-control" id="start_date" name="start_date" value="${project ? project.start_date : ''}" required>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label">종료일</label>
                            <input type="date" class="form-control" id="end_date" name="end_date" value="${project ? project.end_date : ''}" required>
                        </div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">상태</label>
                        <select class="form-select" id="status" name="status" required>
                            <option value="open" ${project && project.status === 'open' ? 'selected' : ''}>모집 중</option>
                            <option value="in_progress" ${project && project.status === 'in_progress' ? 'selected' : ''}>진행 중</option>
                            <option value="completed" ${project && project.status === 'completed' ? 'selected' : ''}>완료</option>
                        </select>
                    </div>
                    <div class="d-flex justify-content-between">
                        <a href="/projects" class="btn btn-secondary">취소</a>
                        <button type="submit" class="btn btn-primary">${project ? '수정' : '생성'}</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

// 프로젝트 제출
async function submitProject(event, projectId = null) {
    event.preventDefault();
    
    const form = event.target;
    if (!form.checkValidity()) {
        event.stopPropagation();
        form.classList.add('was-validated');
        return;
    }
    
    const projectData = {
        title: document.getElementById('title').value,
        description: document.getElementById('description').value,
        requirements: document.getElementById('requirements').value,
        start_date: document.getElementById('start_date').value,
        end_date: document.getElementById('end_date').value,
        status: document.getElementById('status').value
    };
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('로그인이 필요합니다.');
        }

        const response = await fetch('/api/projects', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(projectData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '프로젝트 저장에 실패했습니다.');
        }
        
        showAlert('프로젝트가 생성되었습니다.', 'success');
        window.location.href = '/projects';
    } catch (error) {
        console.error('Error:', error);
        showAlert(error.message, 'danger');
        if (error.message === '로그인이 필요합니다.') {
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
        }
    }
}

// 프로젝트 수정
async function editProject(projectId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('로그인이 필요합니다.');
        }

        const response = await fetch(`/api/projects/${projectId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('프로젝트를 불러오는데 실패했습니다.');
        }
        
        const project = await response.json();
        
        // 프로젝트 수정 폼으로 이동
        window.location.href = `/projects/${projectId}/edit`;
    } catch (error) {
        console.error('Error:', error);
        showAlert(error.message, 'danger');
    }
}

// 프로젝트 삭제
async function deleteProject(projectId) {
    if (!confirm('정말로 이 프로젝트를 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('로그인이 필요합니다.');
        }

        const response = await fetch(`/api/projects/${projectId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '프로젝트 삭제에 실패했습니다.');
        }
        
        showAlert('프로젝트가 삭제되었습니다.', 'success');
        window.location.href = '/projects';
    } catch (error) {
        console.error('Error:', error);
        showAlert(error.message, 'danger');
    }
}

// 작업 목록 로드
async function loadTasks(projectId) {
    try {
        const response = await fetch(`/api/projects/${projectId}/tasks`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('작업 목록을 불러오는데 실패했습니다.');
        }

        const tasks = await response.json();
        const tasksContainer = document.getElementById('tasks-list');
        
        if (!tasks || tasks.length === 0) {
            tasksContainer.innerHTML = '<div class="alert alert-info">아직 등록된 작업이 없습니다.</div>';
        } else {
            tasksContainer.innerHTML = tasks.map(task => `
                <div class="card mb-2">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-1">${task.title}</h6>
                                <p class="mb-1">${task.description}</p>
                                <small class="text-muted">
                                    담당자: ${task.assignee_name} | 
                                    상태: ${task.status} | 
                                    마감일: ${new Date(task.due_date).toLocaleDateString()}
                                </small>
                            </div>
                            ${task.user_id === getCurrentUserId() ? `
                                <button class="btn btn-sm btn-outline-danger" onclick="deleteTask(${projectId}, ${task.id})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert(error.message || '작업 목록을 불러오는데 실패했습니다.', 'danger');
    }
}

// 댓글 목록 로드
async function loadComments(projectId) {
    try {
        const response = await fetch(`/api/projects/${projectId}/comments`, {
            headers: getAuthHeaders()
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
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <h6 class="card-subtitle mb-2 text-muted">${comment.author_name}</h6>
                            <p class="card-text comment-content">${comment.content}</p>
                            <small class="text-muted">${new Date(comment.created_at).toLocaleString()}</small>
                        </div>
                        ${comment.author_id === getCurrentUserId() ? `
                            <div class="btn-group ms-2">
                                <button class="btn btn-sm btn-outline-primary" onclick="editComment(${projectId}, ${comment.id})">
                                    수정
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="deleteComment(${projectId}, ${comment.id})">
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

// 좋아요 토글
async function toggleProjectLike(projectId) {
    try {
        const response = await fetch(`/api/projects/${projectId}/like`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error('좋아요 처리에 실패했습니다.');
        }
        
        const result = await response.json();
        const likeButton = document.querySelector('.fa-heart');
        const likeCount = document.getElementById('like-count');
        
        likeButton.classList.toggle('text-danger');
        likeCount.textContent = result.like_count;
    } catch (error) {
        console.error('Error:', error);
        showAlert(error.message, 'danger');
    }
}

// 프로젝트 댓글 삭제
async function deleteComment(projectId, commentId) {
    if (!confirm('정말로 이 댓글을 삭제하시겠습니까?')) return;
    
    try {
        const response = await fetch(`/api/projects/${projectId}/comments/${commentId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || '댓글 삭제에 실패했습니다.');
        }
        
        // 댓글 목록 새로고침
        await loadComments(projectId);
        
        showAlert('댓글이 삭제되었습니다.', 'success');
    } catch (error) {
        console.error('Error:', error);
        showAlert(error.message, 'danger');
    }
}

// 상태 텍스트 변환
function getStatusText(status) {
    const statusMap = {
        'open': '모집 중',
        'in_progress': '진행 중',
        'completed': '완료',
        'cancelled': '취소됨'
    };
    return statusMap[status] || status;
}

function getTaskStatusText(status) {
    const statusMap = {
        'open': '모집 중',
        'in_progress': '진행 중',
        'completed': '완료',
        'cancelled': '취소됨'
    };
    return statusMap[status] || status;
}

// 알림 표시 함수
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    const container = document.querySelector('.container') || document.body;
    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// 페이지 로드 시 프로젝트 목록 표시
document.addEventListener('DOMContentLoaded', () => {
    displayProjects();
}); 