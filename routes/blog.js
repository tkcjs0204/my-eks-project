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

// 블로그 포스트 목록 조회
router.get('/', async (req, res) => {
    try {
        const posts = await db.all(`
            SELECT b.*, u.name as author_name, u.email as author_email,
                   COUNT(DISTINCT l.id) as like_count,
                   COUNT(DISTINCT c.id) as comment_count
            FROM blog_posts b
            LEFT JOIN users u ON b.user_id = u.id
            LEFT JOIN likes l ON b.id = l.post_id
            LEFT JOIN comments c ON b.id = c.post_id
            GROUP BY b.id
            ORDER BY b.created_at DESC
        `);
        res.json(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ message: '게시글을 불러오는데 실패했습니다.' });
    }
});

// 블로그 포스트 상세 조회
router.get('/:id', async (req, res) => {
    try {
        const post = await db.get(`
            SELECT b.*, u.name as author_name, u.email as author_email,
                   COUNT(DISTINCT l.id) as like_count,
                   COUNT(DISTINCT c.id) as comment_count
            FROM blog_posts b
            LEFT JOIN users u ON b.user_id = u.id
            LEFT JOIN likes l ON b.id = l.post_id
            LEFT JOIN comments c ON b.id = c.post_id
            WHERE b.id = ?
            GROUP BY b.id
        `, [req.params.id]);
        
        if (!post) {
            return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
        }
        
        // 태그 데이터 처리
        if (post.tags) {
            try {
                post.tags = JSON.parse(post.tags);
            } catch (error) {
                console.error('Error parsing tags:', error);
                post.tags = [];
            }
        } else {
            post.tags = [];
        }
        
        res.json(post);
    } catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).json({ message: '게시글을 불러오는데 실패했습니다.' });
    }
});

// 블로그 포스트 작성
router.post('/', authenticateToken, async (req, res) => {
    const { title, content, tags } = req.body;
    
    if (!title || !content) {
        return res.status(400).json({ message: '제목과 내용은 필수입니다.' });
    }

    try {
        const result = await db.run(
            'INSERT INTO blog_posts (title, content, tags, user_id, created_at) VALUES (?, ?, ?, ?, ?)',
            [title, content, JSON.stringify(tags), req.user.id, new Date().toISOString()]
        );

        res.status(201).json({
            id: result.lastID,
            message: '게시글이 성공적으로 작성되었습니다.'
        });
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ message: '게시글 작성에 실패했습니다.' });
    }
});

// 블로그 포스트 수정
router.put('/:id', authenticateToken, async (req, res) => {
    const { title, content, tags } = req.body;
    
    try {
        // 포스트 소유자 확인
        const post = await db.get('SELECT user_id FROM blog_posts WHERE id = ?', [req.params.id]);
        if (!post) {
            return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
        }
        
        if (post.user_id !== req.user.id) {
            return res.status(403).json({ message: '게시글을 수정할 권한이 없습니다.' });
        }
        
        await db.run(
            'UPDATE blog_posts SET title = ?, content = ?, tags = ? WHERE id = ?',
            [title, content, JSON.stringify(tags), req.params.id]
        );
        
        res.json({ message: '게시글이 성공적으로 수정되었습니다.' });
    } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).json({ message: '게시글 수정에 실패했습니다.' });
    }
});

// 블로그 포스트 삭제
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        // 포스트 소유자 확인
        const post = await db.get('SELECT user_id FROM blog_posts WHERE id = ?', [req.params.id]);
        if (!post) {
            return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
        }
        
        if (post.user_id !== req.user.id) {
            return res.status(403).json({ message: '게시글을 삭제할 권한이 없습니다.' });
        }
        
        // 트랜잭션으로 포스트와 관련된 데이터 삭제
        await db.run('BEGIN TRANSACTION');
        
        try {
            await db.run('DELETE FROM comments WHERE post_id = ?', [req.params.id]);
            await db.run('DELETE FROM likes WHERE post_id = ?', [req.params.id]);
            await db.run('DELETE FROM blog_posts WHERE id = ?', [req.params.id]);
            
            await db.run('COMMIT');
            res.json({ message: '게시글이 성공적으로 삭제되었습니다.' });
        } catch (error) {
            await db.run('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ message: '게시글 삭제에 실패했습니다.' });
    }
});

// 좋아요 토글
router.post('/:id/like', authenticateToken, async (req, res) => {
    try {
        // 이미 좋아요를 눌렀는지 확인
        const like = await db.get(
            'SELECT id FROM likes WHERE user_id = ? AND post_id = ?',
            [req.user.id, req.params.id]
        );
        
        if (like) {
            // 좋아요 취소
            await db.run(
                'DELETE FROM likes WHERE id = ?',
                [like.id]
            );
            res.json({ message: '좋아요가 취소되었습니다.' });
        } else {
            // 좋아요 추가
            await db.run(
                'INSERT INTO likes (user_id, post_id) VALUES (?, ?)',
                [req.user.id, req.params.id]
            );
            res.json({ message: '좋아요가 추가되었습니다.' });
        }
    } catch (error) {
        console.error('Error toggling like:', error);
        res.status(500).json({ message: '좋아요 처리에 실패했습니다.' });
    }
});

// 댓글 작성
router.post('/:id/comments', authenticateToken, async (req, res) => {
    const { content } = req.body;
    
    try {
        const result = await db.run(
            'INSERT INTO comments (content, author_id, post_id) VALUES (?, ?, ?)',
            [content, req.user.id, req.params.id]
        );
        
        res.status(201).json({
            message: '댓글이 작성되었습니다.',
            commentId: result.lastID
        });
    } catch (error) {
        console.error('Error creating comment:', error);
        res.status(500).json({ message: '댓글 작성에 실패했습니다.' });
    }
});

// 댓글 삭제
router.delete('/:id/comments/:commentId', authenticateToken, async (req, res) => {
    try {
        // 댓글 소유자 확인
        const comment = await db.get(
            'SELECT author_id FROM comments WHERE id = ? AND post_id = ?',
            [req.params.commentId, req.params.id]
        );
        
        if (!comment) {
            return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
        }
        
        if (comment.author_id !== req.user.id) {
            return res.status(403).json({ message: '댓글을 삭제할 권한이 없습니다.' });
        }
        
        await db.run(
            'DELETE FROM comments WHERE id = ?',
            [req.params.commentId]
        );
        
        res.json({ message: '댓글이 삭제되었습니다.' });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ message: '댓글 삭제에 실패했습니다.' });
    }
});

module.exports = router; 