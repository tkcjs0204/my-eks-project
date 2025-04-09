const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

// 최근 프로젝트 조회
router.get('/recent', async (req, res) => {
    try {
        console.log('최근 프로젝트 조회 시도');
        
        // 더 간단한 쿼리로 수정
        const projects = await db.all(`
            SELECT 
                p.id,
                p.title,
                p.description,
                p.status,
                p.created_at,
                p.github_url,
                p.leader_id,
                u.name as leader_name,
                (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
            FROM projects p
            LEFT JOIN users u ON p.leader_id = u.id
            ORDER BY p.created_at DESC
            LIMIT 5
        `);
        
        console.log('조회된 프로젝트 수:', projects ? projects.length : 0);
        
        // 결과가 null이면 빈 배열 반환
        res.json(projects || []);
    } catch (error) {
        console.error('최근 프로젝트 조회 중 오류 발생:', error);
        res.status(500).json({ 
            message: '프로젝트를 불러오는데 실패했습니다.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// 프로젝트 목록 조회
router.get('/', authenticateToken, async (req, res) => {
    try {
        const projects = await db.all(`
            SELECT 
                p.*,
                u.name as leader_name,
                (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
            FROM projects p
            LEFT JOIN users u ON p.leader_id = u.id
            ORDER BY p.created_at DESC
        `);
        
        res.json(projects || []);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 프로젝트 상세 조회
router.get('/:id', async (req, res) => {
    try {
        const project = await db.get(`
            SELECT 
                p.*,
                u.name as leader_name,
                (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
            FROM projects p
            LEFT JOIN users u ON p.leader_id = u.id
            WHERE p.id = ?
        `, [req.params.id]);
        
        if (!project) {
            return res.status(404).json({ message: '프로젝트를 찾을 수 없습니다.' });
        }
        
        res.json(project);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 프로젝트 생성
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { title, description, status, github_url } = req.body;
        
        // 필수 필드 검증
        if (!title || !description) {
            return res.status(400).json({ 
                message: '제목과 설명은 필수입니다.',
                received: { title, description }
            });
        }

        // 상태값 검증
        const validStatuses = ['계획중', '진행중', '완료'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ 
                message: '유효하지 않은 상태값입니다.',
                validStatuses,
                received: status
            });
        }
        
        console.log('프로젝트 생성 시도:', {
            title,
            description,
            status: status || '계획중',
            github_url,
            leader_id: req.user.id
        });

        const result = await db.run(
            'INSERT INTO projects (title, description, status, github_url, leader_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
            [title, description, status || '계획중', github_url, req.user.id]
        );
        
        console.log('프로젝트 생성 결과:', result);
        
        const newProject = await db.get(`
            SELECT 
                p.*,
                u.name as leader_name,
                0 as member_count
            FROM projects p
            LEFT JOIN users u ON p.leader_id = u.id
            WHERE p.id = ?
        `, [result.lastID]);
        
        console.log('생성된 프로젝트:', newProject);
        
        res.status(201).json(newProject);
    } catch (error) {
        console.error('프로젝트 생성 중 오류 발생:', error);
        res.status(500).json({ 
            message: '서버 오류가 발생했습니다.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// 프로젝트 수정
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { title, description, status, github_url } = req.body;
        const projectId = req.params.id;
        
        // 프로젝트 존재 여부 확인
        const project = await db.get('SELECT * FROM projects WHERE id = ?', [projectId]);
        if (!project) {
            return res.status(404).json({ message: '프로젝트를 찾을 수 없습니다.' });
        }
        
        // 권한 확인 (관리자이거나 리더만 수정 가능)
        if (req.user.role !== 'admin' && project.leader_id !== req.user.id) {
            return res.status(403).json({ message: '프로젝트를 수정할 권한이 없습니다.' });
        }
        
        // 상태값 검증
        const validStatuses = ['계획중', '진행중', '완료'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ 
                message: '유효하지 않은 상태값입니다.',
                validStatuses,
                received: status
            });
        }
        
        // 프로젝트 수정
        await db.run(
            'UPDATE projects SET title = ?, description = ?, status = ?, github_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [title, description, status || project.status, github_url, projectId]
        );
        
        // 수정된 프로젝트 정보 조회
        const updatedProject = await db.get(`
            SELECT 
                p.*,
                u.name as leader_name,
                (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
            FROM projects p
            LEFT JOIN users u ON p.leader_id = u.id
            WHERE p.id = ?
        `, [projectId]);
        
        res.json(updatedProject);
    } catch (error) {
        console.error('프로젝트 수정 중 오류 발생:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 프로젝트 삭제
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const projectId = req.params.id;
        
        // 프로젝트 정보 가져오기
        const project = await db.get('SELECT * FROM projects WHERE id = ?', [projectId]);
        if (!project) {
            return res.status(404).json({ message: '프로젝트를 찾을 수 없습니다.' });
        }
        
        // 어드민이거나 프로젝트 리더인 경우에만 삭제 가능
        if (req.user.role !== 'admin' && req.user.id !== project.leader_id) {
            return res.status(403).json({ message: '프로젝트를 삭제할 권한이 없습니다.' });
        }
        
        // 프로젝트 삭제
        await db.run('DELETE FROM projects WHERE id = ?', [projectId]);
        
        res.json({ message: '프로젝트가 삭제되었습니다.' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: '프로젝트 삭제에 실패했습니다.' });
    }
});

// 댓글 목록 조회
router.get('/:id/comments', async (req, res) => {
    try {
        const comments = await db.all(`
            SELECT 
                c.*,
                u.name as author_name
            FROM project_comments c
            LEFT JOIN users u ON c.author_id = u.id
            WHERE c.project_id = ?
            ORDER BY c.created_at DESC
        `, [req.params.id]);
        
        res.json(comments);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: '댓글을 불러오는데 실패했습니다.' });
    }
});

// 댓글 생성
router.post('/:id/comments', authenticateToken, async (req, res) => {
    try {
        const { content } = req.body;
        const projectId = parseInt(req.params.id, 10);
        
        console.log('댓글 생성 요청:', {
            content,
            projectId,
            authorId: req.user.id
        });
        
        if (!content) {
            return res.status(400).json({ message: '댓글 내용은 필수입니다.' });
        }
        
        // 프로젝트 존재 여부 확인
        const project = await db.get('SELECT id FROM projects WHERE id = ?', [projectId]);
        if (!project) {
            console.log('프로젝트를 찾을 수 없습니다:', projectId);
            return res.status(404).json({ message: '프로젝트를 찾을 수 없습니다.' });
        }
        
        // 댓글 생성
        const result = await db.run(`
            INSERT INTO project_comments (content, project_id, author_id)
            VALUES (?, ?, ?)
        `, [content, projectId, req.user.id]);
        
        console.log('댓글 생성 결과:', result);
        
        // 생성된 댓글 조회
        const comment = await db.get(`
            SELECT 
                c.*,
                u.name as author_name
            FROM project_comments c
            LEFT JOIN users u ON c.author_id = u.id
            WHERE c.id = ?
        `, [result.lastID]);
        
        console.log('생성된 댓글:', comment);
        
        if (!comment) {
            console.log('댓글 생성 후 조회 실패');
            return res.status(500).json({ message: '댓글 생성에 실패했습니다.' });
        }
        
        res.status(201).json(comment);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: '댓글 생성에 실패했습니다.' });
    }
});

// 프로젝트 댓글 삭제
router.delete('/:id/comments/:commentId', authenticateToken, async (req, res) => {
    try {
        // 댓글 작성자 확인
        const comment = await db.get(
            'SELECT author_id FROM project_comments WHERE id = ? AND project_id = ?',
            [req.params.commentId, req.params.id]
        );

        if (!comment) {
            return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
        }

        // 관리자이거나 댓글 작성자인 경우에만 삭제 가능
        if (req.user.role !== 'admin' && comment.author_id !== req.user.id) {
            return res.status(403).json({ message: '댓글을 삭제할 권한이 없습니다.' });
        }

        await db.run(
            'DELETE FROM project_comments WHERE id = ?',
            [req.params.commentId]
        );

        res.json({ message: '댓글이 삭제되었습니다.' });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ message: '댓글 삭제에 실패했습니다.' });
    }
});

module.exports = router; 