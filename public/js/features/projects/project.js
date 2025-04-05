// 프로젝트 목록 로드
async function loadProjects() {
    try {
        const response = await fetch('/api/projects', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '프로젝트를 불러오는데 실패했습니다.');
        }
        const projects = await response.json();
        displayProjects(projects);
    } catch (error) {
        console.error('Error:', error);
        showError(error.message || '프로젝트를 불러오는데 실패했습니다.');
    }
}

// 프로젝트 목록 표시
function displayProjects(projects) {
    const projectsContainer = document.getElementById('projects');
    if (!projectsContainer) return;

    projectsContainer.innerHTML = projects.map(project => {
        const isLeader = project.leader_id === getCurrentUserId();
        
        return `
            <div class="col-md-6">
                <div class="project-card">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h3 class="project-title">${project.title}</h3>
                        ${isLeader ? `
                            <div class="btn-group">
                                <button class="btn btn-outline-primary btn-sm" onclick="router.navigate('/project/${project.id}/edit')">
                                    <i class="fas fa-edit"></i> 수정
                                </button>
                                <button class="btn btn-outline-danger btn-sm" onclick="deleteProject(${project.id})">
                                    <i class="fas fa-trash"></i> 삭제
                                </button>
                            </div>
                        ` : ''}
                    </div>
                    <div class="project-meta">
                        <span>리더: ${project.leader_name}</span>
                        <span class="mx-2">|</span>
                        <span>멤버: ${project.member_count}명</span>
                    </div>
                    <div class="project-description">
                        ${project.description}
                    </div>
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="project-tags">
                            ${project.tags ? project.tags.split(',').map(tag => `
                                <span class="tag">${tag.trim()}</span>
                            `).join('') : ''}
                        </div>
                        <button class="btn btn-outline-primary btn-sm" onclick="router.navigate('/project/${project.id}')">
                            자세히 보기
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 프로젝트 상세 정보 로드
async function loadProject(projectId) {
    try {
        const response = await fetch(`/api/projects/${projectId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '프로젝트를 불러오는데 실패했습니다.');
        }
        const project = await response.json();
        displayProject(project);
        loadProjectMembers(projectId);
    } catch (error) {
        console.error('Error:', error);
        showError(error.message || '프로젝트를 불러오는데 실패했습니다.');
    }
}

// 프로젝트 상세 정보 표시
function displayProject(project) {
    const container = document.getElementById('project-detail');
    if (!container) return;

    container.innerHTML = `
        <div class="container">
            <div class="row justify-content-center">
                <div class="col-lg-10">
                    <div class="card">
                        <div class="card-body">
                            <h1 class="card-title mb-4">${project.title}</h1>
                            <div class="d-flex justify-content-between align-items-center mb-4">
                                <div class="text-muted">
                                    <i class="fas fa-user me-1"></i>
                                    <span>${project.owner_name}</span>
                                    <span class="mx-2">•</span>
                                    <i class="fas fa-calendar me-1"></i>
                                    <span>${new Date(project.created_at).toLocaleDateString('ko-KR')}</span>
                                </div>
                                <div>
                                    <button class="btn btn-outline-secondary btn-sm">
                                        <i class="fas fa-users me-1"></i>
                                        <span id="member-count">${project.member_count || 0}</span> 멤버
                                    </button>
                                </div>
                            </div>
                            <div class="card-text mb-4">
                                ${marked.parse(project.description)}
                            </div>
                        </div>
                    </div>

                    <!-- 멤버 섹션 -->
                    <div class="card mt-4">
                        <div class="card-body">
                            <h5 class="card-title">프로젝트 멤버</h5>
                            <div id="project-members">
                                <!-- 멤버 목록이 여기에 동적으로 추가됩니다 -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// 프로젝트 멤버 목록 로드
async function loadProjectMembers(projectId) {
    try {
        const response = await fetch(`/api/projects/${projectId}/members`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '멤버 목록을 불러오는데 실패했습니다.');
        }
        const members = await response.json();
        displayProjectMembers(members);
    } catch (error) {
        console.error('Error:', error);
        showError(error.message || '멤버 목록을 불러오는데 실패했습니다.');
    }
}

// 프로젝트 멤버 목록 표시
function displayProjectMembers(members) {
    const container = document.getElementById('project-members');
    if (!container) return;

    container.innerHTML = members.map(member => `
        <div class="card mb-3">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="card-subtitle mb-2 text-muted">${member.name}</h6>
                        <small class="text-muted">${member.email}</small>
                    </div>
                    <span class="badge bg-primary">${member.role}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// 새 프로젝트 생성
async function handleProjectSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const projectData = {
        title: formData.get('title'),
        description: formData.get('description')
    };
    
    try {
        const response = await fetch('/api/projects', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(projectData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '프로젝트 생성에 실패했습니다.');
        }
        
        showSuccess('프로젝트가 생성되었습니다.');
        router.navigate('/projects');
    } catch (error) {
        console.error('Error:', error);
        showError(error.message || '프로젝트 생성에 실패했습니다.');
    }
}

// 상태에 따른 배지 색상 반환
function getStatusBadgeColor(status) {
    switch (status) {
        case '진행중':
            return 'success';
        case '완료':
            return 'info';
        case '중단':
            return 'danger';
        default:
            return 'secondary';
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

// 프로젝트 삭제
async function deleteProject(projectId) {
    if (!confirm('정말로 이 프로젝트를 삭제하시겠습니까?')) {
        return;
    }

    try {
        const response = await fetch(`/api/projects/${projectId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '프로젝트 삭제에 실패했습니다.');
        }

        showAlert('프로젝트가 삭제되었습니다.', 'success');
        router.navigate('/projects');
    } catch (error) {
        console.error('프로젝트 삭제 중 오류:', error);
        showAlert(error.message || '프로젝트 삭제에 실패했습니다.', 'danger');
    }
}

// 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', () => {
    // 프로젝트 생성 폼 제출 이벤트
    const projectForm = document.getElementById('project-form');
    if (projectForm) {
        projectForm.addEventListener('submit', handleProjectSubmit);
    }
}); 