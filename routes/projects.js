const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

// 최근 프로젝트 조회
router.get('/recent', async (req, res) => {
    try {
        const projects = await db.all(`
            SELECT 
                p.*,
                u.name as author_name
            FROM projects p
            LEFT JOIN users u ON p.author_id = u.id
            ORDER BY p.created_at DESC
            LIMIT 5
        `);
        
        res.json(projects);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: '프로젝트를 불러오는데 실패했습니다.' });
    }
});

// 프로젝트 목록 조회
router.get('/', async (req, res) => {
    try {
        const projects = await db.all(`
            SELECT 
                p.*,
                u.name as author_name
            FROM projects p
            LEFT JOIN users u ON p.author_id = u.id
            ORDER BY p.created_at DESC
        `);
        
        res.json(projects);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: '프로젝트를 불러오는데 실패했습니다.' });
    }
});

// 프로젝트 상세 조회
router.get('/:id', async (req, res) => {
    try {
        const project = await db.get(`
            SELECT 
                p.*,
                u.name as author_name
            FROM projects p
            LEFT JOIN users u ON p.author_id = u.id
            WHERE p.id = ?
        `, [req.params.id]);
        
        if (!project) {
            return res.status(404).json({ message: '프로젝트를 찾을 수 없습니다.' });
        }
        
        res.json(project);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: '프로젝트를 불러오는데 실패했습니다.' });
    }
});

// 프로젝트 생성
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { title, description } = req.body;
        
        if (!title || !description) {
            return res.status(400).json({ message: '제목과 설명은 필수입니다.' });
        }
        
        const result = await db.run(`
            INSERT INTO projects (title, description, author_id)
            VALUES (?, ?, ?)
        `, [title, description, req.user.id]);
        
        const project = await db.get(`
            SELECT 
                p.*,
                u.name as author_name
            FROM projects p
            LEFT JOIN users u ON p.author_id = u.id
            WHERE p.id = ?
        `, [result.lastID]);
        
        res.status(201).json(project);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: '프로젝트 생성에 실패했습니다.' });
    }
});

// 프로젝트 수정
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { title, description } = req.body;
        
        if (!title || !description) {
            return res.status(400).json({ message: '제목과 설명은 필수입니다.' });
        }
        
        const project = await db.get('SELECT * FROM projects WHERE id = ?', [req.params.id]);
        
        if (!project) {
            return res.status(404).json({ message: '프로젝트를 찾을 수 없습니다.' });
        }
        
        if (project.author_id !== req.user.id) {
            return res.status(403).json({ message: '프로젝트를 수정할 권한이 없습니다.' });
        }
        
        await db.run(`
            UPDATE projects
            SET title = ?, description = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [title, description, req.params.id]);
        
        const updatedProject = await db.get(`
            SELECT 
                p.*,
                u.name as author_name
            FROM projects p
            LEFT JOIN users u ON p.author_id = u.id
            WHERE p.id = ?
        `, [req.params.id]);
        
        res.json(updatedProject);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: '프로젝트 수정에 실패했습니다.' });
    }
});

// 프로젝트 삭제
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const project = await db.get('SELECT * FROM projects WHERE id = ?', [req.params.id]);
        
        if (!project) {
            return res.status(404).json({ message: '프로젝트를 찾을 수 없습니다.' });
        }
        
        if (project.author_id !== req.user.id) {
            return res.status(403).json({ message: '프로젝트를 삭제할 권한이 없습니다.' });
        }
        
        await db.run('DELETE FROM projects WHERE id = ?', [req.params.id]);
        
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

// 댓글 삭제
router.delete('/:projectId/comments/:commentId', authenticateToken, async (req, res) => {
    try {
        const projectId = parseInt(req.params.projectId, 10);
        const commentId = parseInt(req.params.commentId, 10);
        
        console.log(`댓글 삭제 요청: projectId=${projectId}, commentId=${commentId}`);
        
        const comment = await db.get('SELECT * FROM project_comments WHERE id = ? AND project_id = ?', [commentId, projectId]);
        
        console.log('찾은 댓글:', comment);
        
        if (!comment) {
            console.log('댓글을 찾을 수 없습니다.');
            return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
        }
        
        if (comment.author_id !== req.user.id) {
            console.log('댓글 삭제 권한이 없습니다.');
            return res.status(403).json({ message: '댓글을 삭제할 권한이 없습니다.' });
        }
        
        await db.run('DELETE FROM project_comments WHERE id = ? AND project_id = ?', [commentId, projectId]);
        
        console.log('댓글이 삭제되었습니다.');
        res.json({ message: '댓글이 삭제되었습니다.' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: '댓글 삭제에 실패했습니다.' });
    }
});

module.exports = router; 