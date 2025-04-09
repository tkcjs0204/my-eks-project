const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

// 사용자 통계 정보
router.get('/:id/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.params.id;
        
        // 현재 로그인한 사용자만 자신의 통계를 볼 수 있도록 제한
        if (req.user.id !== parseInt(userId)) {
            return res.status(403).json({ message: '다른 사용자의 통계를 볼 수 없습니다.' });
        }
        
        // 게시글 수 조회
        const postCount = await db.get(
            'SELECT COUNT(*) as count FROM blog_posts WHERE author_id = ?',
            [userId]
        );
        
        // 프로젝트 수 조회
        const projectCount = await db.get(
            'SELECT COUNT(*) as count FROM projects WHERE leader_id = ?',
            [userId]
        );
        
        // 좋아요 수 조회
        const likeCount = await db.get(
            'SELECT COUNT(*) as count FROM post_likes WHERE user_id = ?',
            [userId]
        );
        
        res.json({
            post_count: postCount.count,
            project_count: projectCount.count,
            like_count: likeCount.count
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 사용자의 게시글 목록
router.get('/:id/posts', authenticateToken, async (req, res) => {
    try {
        const userId = req.params.id;
        
        // 현재 로그인한 사용자만 자신의 게시글을 볼 수 있도록 제한
        if (req.user.id !== parseInt(userId)) {
            return res.status(403).json({ message: '다른 사용자의 게시글을 볼 수 없습니다.' });
        }
        
        const posts = await db.all(`
            SELECT p.*, 
                   (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
                   (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
            FROM blog_posts p
            WHERE p.author_id = ?
            ORDER BY p.created_at DESC
        `, [userId]);
        
        res.json(posts);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 사용자의 프로젝트 목록
router.get('/:id/projects', authenticateToken, async (req, res) => {
    try {
        const userId = req.params.id;
        
        // 현재 로그인한 사용자만 자신의 프로젝트를 볼 수 있도록 제한
        if (req.user.id !== parseInt(userId)) {
            return res.status(403).json({ message: '다른 사용자의 프로젝트를 볼 수 없습니다.' });
        }
        
        const projects = await db.all(`
            SELECT p.*, 
                   (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
            FROM projects p
            WHERE p.leader_id = ?
            ORDER BY p.created_at DESC
        `, [userId]);
        
        res.json(projects);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 사용자가 좋아요한 게시글 목록
router.get('/:id/likes', authenticateToken, async (req, res) => {
    try {
        const userId = req.params.id;
        
        // 현재 로그인한 사용자만 자신의 좋아요를 볼 수 있도록 제한
        if (req.user.id !== parseInt(userId)) {
            return res.status(403).json({ message: '다른 사용자의 좋아요를 볼 수 없습니다.' });
        }
        
        const posts = await db.all(`
            SELECT p.*, 
                   u.name as author_name,
                   (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
                   (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
            FROM post_likes l
            JOIN blog_posts p ON l.post_id = p.id
            JOIN users u ON p.author_id = u.id
            WHERE l.user_id = ?
            ORDER BY l.created_at DESC
        `, [userId]);
        
        res.json(posts);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 사용자 프로필 수정
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.params.id;
        const { name, email, bio } = req.body;
        
        console.log('프로필 수정 요청:', { userId, name, email, bio });
        
        // 현재 로그인한 사용자만 자신의 프로필을 수정할 수 있도록 제한
        if (req.user.id !== parseInt(userId)) {
            return res.status(403).json({ message: '다른 사용자의 프로필을 수정할 수 없습니다.' });
        }
        
        // 이메일 중복 체크 (자신의 이메일은 제외)
        if (email) {
            const existingUser = await db.get(
                'SELECT * FROM users WHERE email = ? AND id != ?',
                [email, userId]
            );
            if (existingUser) {
                return res.status(400).json({ message: '이미 사용중인 이메일입니다.' });
            }
        }
        
        // 프로필 업데이트
        console.log('프로필 업데이트 SQL 실행');
        const updateFields = [];
        const updateValues = [];
        
        if (name) {
            updateFields.push('name = ?');
            updateValues.push(name);
        }
        if (email) {
            updateFields.push('email = ?');
            updateValues.push(email);
        }
        if (bio !== undefined) {
            updateFields.push('bio = ?');
            updateValues.push(bio);
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({ message: '업데이트할 필드가 없습니다.' });
        }
        
        updateValues.push(userId);
        
        const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
        console.log('Update query:', updateQuery);
        console.log('Update values:', updateValues);
        
        const result = await db.run(updateQuery, updateValues);
        console.log('업데이트 결과:', result);
        
        // 업데이트된 사용자 정보 조회
        const updatedUser = await db.get(
            'SELECT id, name, email, bio, role FROM users WHERE id = ?',
            [userId]
        );
        console.log('업데이트된 사용자 정보:', updatedUser);
        
        if (!updatedUser) {
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }
        
        res.json(updatedUser);
    } catch (error) {
        console.error('프로필 수정 중 오류 발생:', error);
        res.status(500).json({ 
            message: '서버 오류가 발생했습니다.',
            error: error.message 
        });
    }
});

// 비밀번호 변경
router.post('/change-password', authenticateToken, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        const userId = req.user.id;
        
        // 현재 사용자 정보 조회
        const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
        if (!user) {
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }
        
        // 현재 비밀번호 확인
        const isValidPassword = await bcrypt.compare(current_password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: '현재 비밀번호가 일치하지 않습니다.' });
        }
        
        // 새 비밀번호 해시화
        const hashedPassword = await bcrypt.hash(new_password, 10);
        
        // 비밀번호 업데이트
        await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);
        
        res.json({ message: '비밀번호가 변경되었습니다.' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 사용자 프로필 정보 가져오기
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // 사용자 정보 가져오기
        const user = await db.get('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [userId]);
        
        if (!user) {
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }
        
        // 사용자의 게시글 가져오기 (최신 5개)
        const posts = await db.all(`
            SELECT p.*, 
                   u.name as author_name,
                   (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
                   (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
            FROM blog_posts p
            JOIN users u ON p.author_id = u.id
            WHERE p.author_id = ?
            ORDER BY p.created_at DESC
            LIMIT 5
        `, [userId]);
        
        // 사용자의 프로젝트 가져오기 (최신 5개)
        const projects = await db.all(`
            SELECT p.*, 
                   u.name as leader_name,
                   (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
            FROM projects p
            JOIN users u ON p.leader_id = u.id
            WHERE p.leader_id = ?
            ORDER BY p.created_at DESC
            LIMIT 5
        `, [userId]);
        
        // 사용자가 좋아요한 게시글 가져오기 (최신 5개)
        const likedPosts = await db.all(`
            SELECT p.*, 
                   u.name as author_name,
                   (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
                   (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
            FROM post_likes l
            JOIN blog_posts p ON l.post_id = p.id
            JOIN users u ON p.author_id = u.id
            WHERE l.user_id = ?
            ORDER BY l.created_at DESC
            LIMIT 5
        `, [userId]);
        
        // 통계 정보 가져오기
        const stats = {
            post_count: await db.get('SELECT COUNT(*) as count FROM blog_posts WHERE author_id = ?', [userId]),
            project_count: await db.get('SELECT COUNT(*) as count FROM projects WHERE leader_id = ?', [userId]),
            like_count: await db.get('SELECT COUNT(*) as count FROM post_likes WHERE user_id = ?', [userId]),
            comment_count: await db.get('SELECT COUNT(*) as count FROM comments WHERE author_id = ?', [userId])
        };
        
        res.json({
            user,
            posts,
            projects,
            liked_posts: likedPosts,
            stats: {
                post_count: stats.post_count.count,
                project_count: stats.project_count.count,
                like_count: stats.like_count.count,
                comment_count: stats.comment_count.count
            }
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 사용자 프로필 조회
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.params.id;
        
        // 사용자 기본 정보 조회
        const user = await db.get(
            'SELECT id, name, email, bio, role, created_at FROM users WHERE id = ?',
            [userId]
        );
        
        if (!user) {
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }
        
        // 작성한 게시글 조회
        const posts = await db.all(`
            SELECT p.*, 
                   (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
                   (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
            FROM blog_posts p
            WHERE p.author_id = ?
            ORDER BY p.created_at DESC
            LIMIT 5
        `, [userId]);
        
        // 작성한 프로젝트 조회
        const projects = await db.all(`
            SELECT p.*, 
                   (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
            FROM projects p
            WHERE p.leader_id = ?
            ORDER BY p.created_at DESC
            LIMIT 5
        `, [userId]);
        
        // 좋아요한 게시글 조회
        const likedPosts = await db.all(`
            SELECT p.*, 
                   u.name as author_name,
                   (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
                   (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
            FROM post_likes l
            JOIN blog_posts p ON l.post_id = p.id
            JOIN users u ON p.author_id = u.id
            WHERE l.user_id = ?
            ORDER BY l.created_at DESC
            LIMIT 5
        `, [userId]);
        
        res.json({
            user,
            posts,
            projects,
            likedPosts
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

module.exports = router; 