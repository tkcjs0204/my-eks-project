const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

// 최근 게시글 조회 (단순화)
router.get('/recent', async (req, res) => {
    try {
        const posts = await db.all(`
            SELECT p.id, p.title, p.content, p.createdAt, u.name as author_name
            FROM Posts p
            LEFT JOIN Users u ON p.UserId = u.id
            ORDER BY p.createdAt DESC
            LIMIT 5
        `);
        res.json(posts || []);
    } catch (error) {
        console.error('Error fetching recent posts:', error);
        res.status(500).json({ message: '게시글을 불러오는데 실패했습니다.' });
    }
});

// 게시글 목록 조회 (단순화)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const posts = await db.all(`
            SELECT p.id, p.title, p.content, p.createdAt, u.name as author_name
            FROM Posts p
            LEFT JOIN Users u ON p.UserId = u.id
            ORDER BY p.createdAt DESC
        `);
        res.json(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ message: '게시글을 불러오는데 실패했습니다.' });
    }
});

// 게시글 상세 조회 (단순화)
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const postId = req.params.id;
        const post = await db.get(`
            SELECT p.id, p.title, p.content, p.createdAt, u.name as author_name, p.UserId
            FROM Posts p
            LEFT JOIN Users u ON p.UserId = u.id
            WHERE p.id = ?
        `, [postId]);

        if (!post) {
            return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
        }
        res.json(post);
    } catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).json({ message: '게시글을 불러오는데 실패했습니다.' });
    }
});

// 게시글 작성 (단순화)
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { title, content } = req.body;
        if (!title || !content) {
            return res.status(400).json({ message: '제목과 내용은 필수입니다.' });
        }
        const result = await db.run(
            'INSERT INTO Posts (title, content, UserId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
            [title, content, req.user.id, new Date().toISOString(), new Date().toISOString()]
        );
        const newPost = await db.get('SELECT * FROM Posts WHERE id = ?', result.lastID);
        res.status(201).json(newPost);
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ message: '게시글 작성에 실패했습니다.' });
    }
});

// 게시글 수정 (단순화)
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const postId = req.params.id;
        const { title, content } = req.body;
        const post = await db.get('SELECT * FROM Posts WHERE id = ?', [postId]);
        if (!post) {
            return res.status(404).json({ message: '게시글이 존재하지 않습니다.' });
        }
        if (req.user.role !== 'admin' && post.UserId !== req.user.id) {
            return res.status(403).json({ message: '게시글을 수정할 권한이 없습니다.' });
        }
        await db.run(
            'UPDATE Posts SET title = ?, content = ?, updatedAt = ? WHERE id = ?',
            [title, content, new Date().toISOString(), postId]
        );
        const updatedPost = await db.get('SELECT * FROM Posts WHERE id = ?', postId);
        res.json(updatedPost);
    } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).json({ message: '게시글 수정에 실패했습니다.' });
    }
});

// 게시글 삭제 (단순화, 댓글/좋아요 등 연관 데이터 삭제는 일단 제외)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const postId = req.params.id;
        const post = await db.get('SELECT * FROM Posts WHERE id = ?', [postId]);
        if (!post) {
            return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
        }
        if (req.user.role !== 'admin' && post.UserId !== req.user.id) {
            return res.status(403).json({ message: '게시글을 삭제할 권한이 없습니다.' });
        }
        await db.run('DELETE FROM Posts WHERE id = ?', [postId]);
        res.json({ message: '게시글이 삭제되었습니다.' });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ message: '게시글 삭제에 실패했습니다.' });
    }
});

// 댓글, 좋아요, 검색 관련 라우트는 안정화를 위해 일단 제거합니다.

module.exports = router; 