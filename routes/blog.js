const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

// 최근 게시글 조회 (가장 먼저 정의)
router.get('/posts/recent', async (req, res) => {
    try {
        const posts = await db.all(`
            SELECT 
                p.*,
                u.name as author_name
            FROM posts p
            LEFT JOIN users u ON p.author_id = u.id
            ORDER BY p.created_at DESC
            LIMIT 5
        `);
        
        res.json(posts);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: '게시글을 불러오는데 실패했습니다.' });
    }
});

// 블로그 포스트 목록 조회
router.get('/posts', async (req, res) => {
    try {
        const posts = await db.all(`
            SELECT p.*, u.name as author_name, u.email as author_email,
                   COUNT(DISTINCT l.id) as like_count,
                   COUNT(DISTINCT c.id) as comment_count
            FROM posts p
            LEFT JOIN users u ON p.author_id = u.id
            LEFT JOIN likes l ON p.id = l.post_id
            LEFT JOIN comments c ON p.id = c.post_id
            GROUP BY p.id
            ORDER BY p.created_at DESC
        `);
        res.json(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ message: '게시글을 불러오는데 실패했습니다.' });
    }
});

// 블로그 포스트 상세 조회
router.get('/posts/:id', async (req, res) => {
    try {
        const post = await db.get(`
            SELECT p.*, u.name as author_name, u.email as author_email,
                   COUNT(DISTINCT l.id) as like_count,
                   COUNT(DISTINCT c.id) as comment_count,
                   EXISTS(
                       SELECT 1 FROM likes 
                       WHERE post_id = p.id 
                       AND user_id = ?
                   ) as is_liked
            FROM posts p
            LEFT JOIN users u ON p.author_id = u.id
            LEFT JOIN likes l ON p.id = l.post_id
            LEFT JOIN comments c ON p.id = c.post_id
            WHERE p.id = ?
            GROUP BY p.id
        `, [req.user?.id || 0, req.params.id]);
        
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
        
        // is_liked를 boolean으로 변환
        post.is_liked = Boolean(post.is_liked);
        
        res.json(post);
    } catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).json({ message: '게시글을 불러오는데 실패했습니다.' });
    }
});

// 블로그 포스트 작성
router.post('/posts', authenticateToken, async (req, res) => {
    const { title, content, tags } = req.body;
    
    if (!title || !content) {
        return res.status(400).json({ message: '제목과 내용은 필수입니다.' });
    }

    try {
        const result = await db.run(
            'INSERT INTO posts (title, content, tags, author_id, created_at) VALUES (?, ?, ?, ?, ?)',
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
router.put('/posts/:id', authenticateToken, async (req, res) => {
    const { title, content, tags } = req.body;
    
    if (!title || !content) {
        return res.status(400).json({ message: '제목과 내용은 필수입니다.' });
    }

    try {
        // 게시글 작성자 확인
        const post = await db.get('SELECT author_id FROM posts WHERE id = ?', [req.params.id]);
        if (!post) {
            return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
        }
        if (post.author_id !== req.user.id) {
            return res.status(403).json({ message: '게시글을 수정할 권한이 없습니다.' });
        }

        await db.run(
            'UPDATE posts SET title = ?, content = ?, tags = ? WHERE id = ?',
            [title, content, JSON.stringify(tags), req.params.id]
        );

        res.json({ message: '게시글이 성공적으로 수정되었습니다.' });
    } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).json({ message: '게시글 수정에 실패했습니다.' });
    }
});

// 블로그 포스트 삭제
router.delete('/posts/:id', authenticateToken, async (req, res) => {
    try {
        // 게시글 작성자 확인
        const post = await db.get('SELECT author_id FROM posts WHERE id = ?', [req.params.id]);
        if (!post) {
            return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
        }
        if (post.author_id !== req.user.id) {
            return res.status(403).json({ message: '게시글을 삭제할 권한이 없습니다.' });
        }

        // 좋아요와 댓글 삭제
        await db.run('DELETE FROM likes WHERE post_id = ?', [req.params.id]);
        await db.run('DELETE FROM comments WHERE post_id = ?', [req.params.id]);
        
        // 게시글 삭제
        await db.run('DELETE FROM posts WHERE id = ?', [req.params.id]);

        res.json({ message: '게시글이 성공적으로 삭제되었습니다.' });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ message: '게시글 삭제에 실패했습니다.' });
    }
});

// 좋아요 추가/제거
router.post('/posts/:id/like', authenticateToken, async (req, res) => {
    try {
        // 이미 좋아요를 눌렀는지 확인
        const existingLike = await db.get(
            'SELECT id FROM likes WHERE post_id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );

        if (existingLike) {
            // 좋아요 제거
            await db.run(
                'DELETE FROM likes WHERE post_id = ? AND user_id = ?',
                [req.params.id, req.user.id]
            );
            res.json({ 
                message: '좋아요가 제거되었습니다.',
                is_liked: false
            });
        } else {
            // 좋아요 추가
            await db.run(
                'INSERT INTO likes (post_id, user_id, created_at) VALUES (?, ?, ?)',
                [req.params.id, req.user.id, new Date().toISOString()]
            );
            res.json({ 
                message: '좋아요가 추가되었습니다.',
                is_liked: true
            });
        }
    } catch (error) {
        console.error('Error toggling like:', error);
        res.status(500).json({ message: '좋아요 처리에 실패했습니다.' });
    }
});

// 댓글 목록 조회
router.get('/posts/:id/comments', async (req, res) => {
    try {
        const comments = await db.all(`
            SELECT c.*, u.name as author_name, u.id as author_id
            FROM comments c
            INNER JOIN users u ON c.author_id = u.id
            WHERE c.post_id = ?
            ORDER BY c.created_at DESC
        `, [req.params.id]);
        
        res.json(comments || []);
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ message: '댓글을 불러오는데 실패했습니다.' });
    }
});

// 댓글 작성
router.post('/posts/:id/comments', authenticateToken, async (req, res) => {
    const { content } = req.body;
    
    if (!content) {
        return res.status(400).json({ message: '댓글 내용은 필수입니다.' });
    }

    try {
        // 게시글 존재 여부 확인
        const post = await db.get('SELECT id FROM posts WHERE id = ?', [req.params.id]);
        if (!post) {
            return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
        }

        // 사용자 정보 확인
        const user = await db.get('SELECT id, name FROM users WHERE id = ?', [req.user.id]);
        if (!user) {
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }

        const result = await db.run(
            'INSERT INTO comments (post_id, author_id, content, created_at) VALUES (?, ?, ?, ?)',
            [req.params.id, user.id, content, new Date().toISOString()]
        );

        // 새로 작성된 댓글 정보 조회
        const comment = await db.get(`
            SELECT c.*, u.name as author_name, u.id as author_id
            FROM comments c
            INNER JOIN users u ON c.author_id = u.id
            WHERE c.id = ?
        `, [result.lastID]);

        if (!comment) {
            throw new Error('댓글 정보를 찾을 수 없습니다.');
        }

        res.status(201).json(comment);
    } catch (error) {
        console.error('Error creating comment:', error);
        res.status(500).json({ message: '댓글 작성에 실패했습니다.' });
    }
});

// 댓글 삭제
router.delete('/posts/:id/comments/:commentId', authenticateToken, async (req, res) => {
    try {
        // 댓글 작성자 확인
        const comment = await db.get(
            'SELECT author_id FROM comments WHERE id = ?',
            [req.params.commentId]
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

// 댓글 수정
router.put('/posts/:id/comments/:commentId', authenticateToken, async (req, res) => {
    const { content } = req.body;
    
    if (!content) {
        return res.status(400).json({ message: '댓글 내용은 필수입니다.' });
    }

    try {
        // 댓글 작성자 확인
        const comment = await db.get(
            'SELECT author_id FROM comments WHERE id = ?',
            [req.params.commentId]
        );

        if (!comment) {
            return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
        }

        if (comment.author_id !== req.user.id) {
            return res.status(403).json({ message: '댓글을 수정할 권한이 없습니다.' });
        }

        await db.run(
            'UPDATE comments SET content = ? WHERE id = ?',
            [content, req.params.commentId]
        );

        // 수정된 댓글 정보 조회
        const updatedComment = await db.get(`
            SELECT c.*, u.name as author_name, u.id as author_id
            FROM comments c
            INNER JOIN users u ON c.author_id = u.id
            WHERE c.id = ?
        `, [req.params.commentId]);

        res.json(updatedComment);
    } catch (error) {
        console.error('Error updating comment:', error);
        res.status(500).json({ message: '댓글 수정에 실패했습니다.' });
    }
});

module.exports = router; 