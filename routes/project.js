const express = require('express');
const router = express.Router();
const { db } = require('../database');
const jwt = require('jsonwebtoken');

// 인증 미들웨어
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: '인증이 필요합니다.' });
    }

    jwt.verify(token, 'note4u-secret-key-2024', (err, user) => {
        if (err) {
            return res.status(403).json({ message: '유효하지 않은 토큰입니다.' });
        }
        req.user = user;
        next();
    });
};

// 프로젝트 목록 조회
router.get('/', async (req, res) => {
    try {
        const projects = await db.all(`
            SELECT p.*, u.name as leader_name,
                   (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
            FROM projects p
            LEFT JOIN users u ON p.leader_id = u.id
            ORDER BY p.created_at DESC
        `);
        res.json(projects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ message: '프로젝트 목록을 불러오는데 실패했습니다.' });
    }
});

// 프로젝트 상세 조회
router.get('/:id', async (req, res) => {
    try {
        const project = await db.get(`
            SELECT p.*, u.name as leader_name,
                   (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
            FROM projects p
            LEFT JOIN users u ON p.leader_id = u.id
            WHERE p.id = ?
        `, [req.params.id]);
        
        if (!project) {
            return res.status(404).json({ message: '프로젝트를 찾을 수 없습니다.' });
        }
        
        // 프로젝트 멤버 조회
        const members = await db.all(`
            SELECT u.id, u.name, u.email, pm.role, pm.joined_at
            FROM project_members pm
            LEFT JOIN users u ON pm.user_id = u.id
            WHERE pm.project_id = ?
            ORDER BY pm.joined_at DESC
        `, [req.params.id]);
        
        project.members = members;
        res.json(project);
    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({ message: '프로젝트 정보를 불러오는데 실패했습니다.' });
    }
});

// 프로젝트 생성
router.post('/', authenticateToken, async (req, res) => {
    const { title, description, requirements, status } = req.body;
    
    if (!title || !description) {
        return res.status(400).json({ message: '제목과 설명은 필수입니다.' });
    }

    try {
        const result = await db.run(
            'INSERT INTO projects (title, description, requirements, status, leader_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [title, description, requirements, status || 'open', req.user.id, new Date().toISOString()]
        );

        // 프로젝트 생성자를 멤버로 추가
        await db.run(
            'INSERT INTO project_members (project_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)',
            [result.lastID, req.user.id, 'leader', new Date().toISOString()]
        );

        res.status(201).json({
            id: result.lastID,
            message: '프로젝트가 성공적으로 생성되었습니다.'
        });
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ message: '프로젝트 생성에 실패했습니다.' });
    }
});

// 프로젝트 수정
router.put('/:id', authenticateToken, async (req, res) => {
    const { title, description, requirements, status } = req.body;
    
    try {
        // 프로젝트 소유자 확인
        const project = await db.get('SELECT leader_id FROM projects WHERE id = ?', [req.params.id]);
        if (!project) {
            return res.status(404).json({ message: '프로젝트를 찾을 수 없습니다.' });
        }
        
        if (project.leader_id !== req.user.id) {
            return res.status(403).json({ message: '프로젝트를 수정할 권한이 없습니다.' });
        }
        
        await db.run(
            'UPDATE projects SET title = ?, description = ?, requirements = ?, status = ? WHERE id = ?',
            [title, description, requirements, status, req.params.id]
        );
        
        res.json({ message: '프로젝트가 성공적으로 수정되었습니다.' });
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ message: '프로젝트 수정에 실패했습니다.' });
    }
});

// 프로젝트 삭제
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        // 프로젝트 소유자 확인
        const project = await db.get('SELECT leader_id FROM projects WHERE id = ?', [req.params.id]);
        if (!project) {
            return res.status(404).json({ message: '프로젝트를 찾을 수 없습니다.' });
        }
        
        if (project.leader_id !== req.user.id) {
            return res.status(403).json({ message: '프로젝트를 삭제할 권한이 없습니다.' });
        }
        
        // 트랜잭션으로 프로젝트와 관련된 데이터 삭제
        await db.run('BEGIN TRANSACTION');
        
        try {
            await db.run('DELETE FROM project_members WHERE project_id = ?', [req.params.id]);
            await db.run('DELETE FROM projects WHERE id = ?', [req.params.id]);
            
            await db.run('COMMIT');
            res.json({ message: '프로젝트가 성공적으로 삭제되었습니다.' });
        } catch (error) {
            await db.run('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ message: '프로젝트 삭제에 실패했습니다.' });
    }
});

// 프로젝트 참여
router.post('/:id/join', authenticateToken, async (req, res) => {
    try {
        // 이미 참여 중인지 확인
        const member = await db.get(
            'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        
        if (member) {
            return res.status(400).json({ message: '이미 참여 중인 프로젝트입니다.' });
        }
        
        // 프로젝트 상태 확인
        const project = await db.get('SELECT status FROM projects WHERE id = ?', [req.params.id]);
        if (!project) {
            return res.status(404).json({ message: '프로젝트를 찾을 수 없습니다.' });
        }
        
        if (project.status !== 'open') {
            return res.status(400).json({ message: '현재 참여가 불가능한 프로젝트입니다.' });
        }
        
        // 프로젝트 참여
        await db.run(
            'INSERT INTO project_members (project_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)',
            [req.params.id, req.user.id, 'member', new Date().toISOString()]
        );
        
        res.json({ message: '프로젝트에 성공적으로 참여했습니다.' });
    } catch (error) {
        console.error('Error joining project:', error);
        res.status(500).json({ message: '프로젝트 참여에 실패했습니다.' });
    }
});

// 프로젝트 탈퇴
router.post('/:id/leave', authenticateToken, async (req, res) => {
    try {
        // 프로젝트 멤버 확인
        const member = await db.get(
            'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        
        if (!member) {
            return res.status(404).json({ message: '참여 중인 프로젝트가 아닙니다.' });
        }
        
        if (member.role === 'leader') {
            return res.status(400).json({ message: '프로젝트 리더는 탈퇴할 수 없습니다.' });
        }
        
        // 프로젝트 탈퇴
        await db.run(
            'DELETE FROM project_members WHERE project_id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        
        res.json({ message: '프로젝트에서 성공적으로 탈퇴했습니다.' });
    } catch (error) {
        console.error('Error leaving project:', error);
        res.status(500).json({ message: '프로젝트 탈퇴에 실패했습니다.' });
    }
});

module.exports = router; 