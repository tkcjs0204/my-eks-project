const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// 어드민 권한 확인
router.get('/check', authenticateToken, isAdmin, async (req, res) => {
    res.json({ message: '어드민 권한이 확인되었습니다.' });
});

// 모든 사용자 목록 조회
router.get('/users', authenticateToken, isAdmin, async (req, res) => {
    try {
        const users = await db.all('SELECT id, name, email, role, created_at FROM users');
        res.json(users);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: '사용자 목록을 불러오는데 실패했습니다.' });
    }
});

// 시스템 통계
router.get('/stats', authenticateToken, isAdmin, async (req, res) => {
    try {
        const [users, posts, projects, comments] = await Promise.all([
            db.get('SELECT COUNT(*) as count FROM users'),
            db.get('SELECT COUNT(*) as count FROM blog_posts'),
            db.get('SELECT COUNT(*) as count FROM projects'),
            db.get('SELECT COUNT(*) as count FROM comments')
        ]);
        
        res.json({
            users,
            posts,
            projects,
            comments
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: '통계를 불러오는데 실패했습니다.' });
    }
});

// 특정 사용자의 역할 변경
router.put('/users/:id/role', authenticateToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ message: '잘못된 역할입니다.' });
    }

    try {
        await db.run('UPDATE users SET role = ? WHERE id = ?', [role, id]);
        res.json({ message: '사용자 역할이 변경되었습니다.' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: '사용자 역할 변경에 실패했습니다.' });
    }
});

// 사용자 삭제
router.delete('/users/:id', authenticateToken, isAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        await db.run('DELETE FROM users WHERE id = ?', [id]);
        res.json({ message: '사용자가 삭제되었습니다.' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: '사용자 삭제에 실패했습니다.' });
    }
});

// 어드민 대시보드
router.get('/dashboard', authenticateToken, isAdmin, async (req, res) => {
    try {
        // 시스템 통계
        const [users, posts, projects, comments] = await Promise.all([
            db.get('SELECT COUNT(*) as count FROM users'),
            db.get('SELECT COUNT(*) as count FROM blog_posts'),
            db.get('SELECT COUNT(*) as count FROM projects'),
            db.get('SELECT COUNT(*) as count FROM comments')
        ]);
        
        // 최근 가입한 사용자
        const recentUsers = await db.all(`
            SELECT id, name, email, role, created_at 
            FROM users 
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        
        // 최근 작성된 게시글
        const recentPosts = await db.all(`
            SELECT p.*, u.name as author_name
            FROM blog_posts p
            JOIN users u ON p.author_id = u.id
            ORDER BY p.created_at DESC
            LIMIT 5
        `);
        
        // 최근 생성된 프로젝트
        const recentProjects = await db.all(`
            SELECT p.*, u.name as leader_name
            FROM projects p
            JOIN users u ON p.leader_id = u.id
            ORDER BY p.created_at DESC
            LIMIT 5
        `);
        
        res.json({
            stats: {
                users: users.count,
                posts: posts.count,
                projects: projects.count,
                comments: comments.count
            },
            recentUsers,
            recentPosts,
            recentProjects
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: '대시보드 데이터를 불러오는데 실패했습니다.' });
    }
});

module.exports = router; 