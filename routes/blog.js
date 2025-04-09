const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const Post = require('../models/post');

// 최근 게시글 조회 (가장 먼저 정의)
router.get('/posts/recent', async (req, res) => {
    try {
        const posts = await db.all(`
            SELECT 
                p.*,
                u.name as author_name,
                COALESCE((SELECT COUNT(*) FROM post_likes WHERE post_id = p.id), 0) as like_count,
                COALESCE((SELECT COUNT(*) FROM comments WHERE post_id = p.id), 0) as comment_count
            FROM blog_posts p
            LEFT JOIN users u ON p.author_id = u.id
            ORDER BY p.created_at DESC
            LIMIT 5
        `);
        
        // 태그 문자열을 배열로 변환
        const formattedPosts = posts.map(post => ({
            ...post,
            tags: post.tags ? post.tags.split(',').map(tag => tag.trim()) : []
        }));
        
        res.json(formattedPosts || []);
    } catch (error) {
        console.error('Error fetching recent posts:', error);
        res.status(500).json({ message: '게시글을 불러오는데 실패했습니다.' });
    }
});

// 게시글 목록 조회
router.get('/posts', authenticateToken, async (req, res) => {
    try {
        const posts = await db.all(`
            SELECT 
                p.*,
                u.name as author_name,
                (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
                (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
                GROUP_CONCAT(pt.tag_name) as tags
            FROM blog_posts p
            LEFT JOIN users u ON p.author_id = u.id
            LEFT JOIN post_tags pt ON p.id = pt.post_id
            GROUP BY p.id
            ORDER BY p.created_at DESC
        `);
        
        // 태그 문자열을 배열로 변환
        const formattedPosts = posts.map(post => ({
            ...post,
            tags: post.tags ? post.tags.split(',') : []
        }));
        
        res.json(formattedPosts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ message: '게시글을 불러오는데 실패했습니다.' });
    }
});

// 게시글 상세 조회
router.get('/posts/:id', authenticateToken, async (req, res) => {
    try {
        const postId = req.params.id;
        const post = await db.get(`
            SELECT 
                p.*,
                u.name as author_name,
                (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
                (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
                EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = ?) as is_liked,
                GROUP_CONCAT(pt.tag_name) as tags
            FROM blog_posts p
            LEFT JOIN users u ON p.author_id = u.id
            LEFT JOIN post_tags pt ON p.id = pt.post_id
            WHERE p.id = ?
            GROUP BY p.id
        `, [req.user.id, postId]);

        if (!post) {
            return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
        }

        // 태그 문자열을 배열로 변환
        post.tags = post.tags ? post.tags.split(',') : [];

        res.json(post);
    } catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).json({ message: '게시글을 불러오는데 실패했습니다.' });
    }
});

// 게시글 작성
router.post('/posts', authenticateToken, async (req, res) => {
    try {
        const { title, content, tags } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ message: '제목과 내용은 필수입니다.' });
        }

        // 게시글 생성
        const result = await db.run(
            'INSERT INTO blog_posts (title, content, author_id) VALUES (?, ?, ?)',
            [title, content, req.user.id]
        );

        const postId = result.lastID;

        // 태그 추가
        if (tags && Array.isArray(tags)) {
            for (const tag of tags) {
                await db.run(
                    'INSERT INTO post_tags (post_id, tag_name) VALUES (?, ?)',
                    [postId, tag]
                );
            }
        }

        // 생성된 게시글 정보 조회
        const newPost = await db.get(`
            SELECT 
                p.*, 
                u.name as author_name,
                0 as like_count,
                0 as comment_count,
                0 as is_liked,
                GROUP_CONCAT(pt.tag_name) as tags
            FROM blog_posts p
            LEFT JOIN users u ON p.author_id = u.id
            LEFT JOIN post_tags pt ON p.id = pt.post_id
            WHERE p.id = ?
            GROUP BY p.id
        `, [postId]);

        // 태그 문자열을 배열로 변환
        newPost.tags = newPost.tags ? newPost.tags.split(',') : [];

        res.status(201).json(newPost);
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ message: '게시글 작성에 실패했습니다.' });
    }
});

// 게시글 수정
router.put('/posts/:id', authenticateToken, async (req, res) => {
    try {
        const postId = req.params.id;
        const { title, content, tags } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;

        // 게시글 존재 여부 확인
        const post = await db.get('SELECT * FROM blog_posts WHERE id = ?', [postId]);
        if (!post) {
            return res.status(404).json({ message: '게시글이 존재하지 않습니다.' });
        }

        // 권한 체크: 관리자이거나 게시글 작성자인 경우에만 수정 가능
        if (userRole !== 'admin' && post.author_id !== userId) {
            return res.status(403).json({ message: '게시글을 수정할 권한이 없습니다.' });
        }

        // 게시글 수정
        await db.run(
            'UPDATE blog_posts SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [title, content, postId]
        );

        // 태그 업데이트
        if (tags) {
            // 기존 태그 삭제
            await db.run('DELETE FROM post_tags WHERE post_id = ?', [postId]);
            
            // 새 태그 추가
            for (const tag of tags) {
                await db.run(
                    'INSERT INTO post_tags (post_id, tag_name) VALUES (?, ?)',
                    [postId, tag]
                );
            }
        }

        // 수정된 게시글 정보 반환
        const updatedPost = await db.get(`
            SELECT p.*, u.name as author_name,
                   (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
                   (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
                   GROUP_CONCAT(pt.tag_name) as tags
            FROM blog_posts p
            LEFT JOIN users u ON p.author_id = u.id
            LEFT JOIN post_tags pt ON p.id = pt.post_id
            WHERE p.id = ?
            GROUP BY p.id
        `, [postId]);

        res.json(updatedPost);
    } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).json({ message: '게시글 수정에 실패했습니다.' });
    }
});

// 게시글 삭제
router.delete('/posts/:id', authenticateToken, async (req, res) => {
    try {
        const postId = req.params.id;
        
        // 게시글 정보 가져오기
        const post = await db.get('SELECT * FROM blog_posts WHERE id = ?', [postId]);
        if (!post) {
            return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
        }
        
        // 어드민이거나 게시글 작성자인 경우에만 삭제 가능
        if (req.user.role !== 'admin' && req.user.id !== post.author_id) {
            return res.status(403).json({ message: '게시글을 삭제할 권한이 없습니다.' });
        }

        // 트랜잭션 시작
        await db.run('BEGIN TRANSACTION');
        
        try {
            // 관련된 태그 삭제
            await db.run('DELETE FROM post_tags WHERE post_id = ?', [postId]);
            
            // 관련된 좋아요 삭제
            await db.run('DELETE FROM post_likes WHERE post_id = ?', [postId]);
            
            // 관련된 댓글 좋아요 삭제
            await db.run('DELETE FROM comment_likes WHERE comment_id IN (SELECT id FROM comments WHERE post_id = ?)', [postId]);
            
            // 관련된 댓글 삭제
            await db.run('DELETE FROM comments WHERE post_id = ?', [postId]);
            
            // 게시글 삭제
            await db.run('DELETE FROM blog_posts WHERE id = ?', [postId]);
            
            // 트랜잭션 커밋
            await db.run('COMMIT');
            
            res.json({ message: '게시글이 삭제되었습니다.' });
        } catch (error) {
            // 오류 발생 시 롤백
            await db.run('ROLLBACK');
            console.error('Error during post deletion:', error);
            throw error;
        }
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ message: '게시글 삭제에 실패했습니다.' });
    }
});

// 게시글 좋아요/좋아요 취소
router.post('/posts/:id/like', authenticateToken, async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user.id;
        
        // 게시글 존재 여부 확인
        const post = await db.get('SELECT * FROM blog_posts WHERE id = ?', [postId]);
        if (!post) {
            return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
        }
        
        // 현재 좋아요 상태 확인
        const like = await db.get(
            'SELECT * FROM post_likes WHERE post_id = ? AND user_id = ?',
            [postId, userId]
        );
        
        // 현재 좋아요 수 확인
        const likeCount = await db.get(
            'SELECT COUNT(*) as count FROM post_likes WHERE post_id = ?',
            [postId]
        );
        
        if (like) {
            // 좋아요 취소
            await db.run(
                'DELETE FROM post_likes WHERE post_id = ? AND user_id = ?',
                [postId, userId]
            );
            
            res.json({ 
                isLiked: false, 
                likesCount: Math.max(0, likeCount.count - 1) 
            });
        } else {
            // 좋아요 추가
            await db.run(
                'INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)',
                [postId, userId]
            );
            
            res.json({ 
                isLiked: true, 
                likesCount: likeCount.count + 1 
            });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: '좋아요 처리에 실패했습니다.' });
    }
});

// 게시글 좋아요 상태 확인
router.get('/posts/:id/like', authenticateToken, async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user.id;
        
        // 게시글 존재 여부 확인
        const post = await db.get('SELECT * FROM blog_posts WHERE id = ?', [postId]);
        if (!post) {
            return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
        }
        
        const like = await db.get(
            'SELECT * FROM post_likes WHERE post_id = ? AND user_id = ?',
            [postId, userId]
        );
        
        res.json({ 
            isLiked: !!like,
            likesCount: post.likes_count || 0
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: '좋아요 상태 확인에 실패했습니다.' });
    }
});

// 댓글 목록 조회
router.get('/posts/:postId/comments', async (req, res) => {
    try {
        const postId = req.params.postId;
        const userId = req.user ? req.user.id : null;

        const comments = await db.all(`
            SELECT 
                c.*,
                u.name as author_name,
                (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id) as like_count,
                ${userId ? `EXISTS(SELECT 1 FROM comment_likes WHERE comment_id = c.id AND user_id = ${userId}) as is_liked` : '0 as is_liked'}
            FROM comments c
            LEFT JOIN users u ON c.author_id = u.id
            WHERE c.post_id = ?
            ORDER BY c.created_at DESC
        `, [postId]);

        res.json(comments);
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
        const post = await db.get('SELECT id FROM blog_posts WHERE id = ?', [req.params.id]);
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
router.delete('/posts/:postId/comments/:commentId', authenticateToken, async (req, res) => {
    try {
        const { postId, commentId } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        // 댓글 존재 여부 확인
        const comment = await db.get('SELECT * FROM comments WHERE id = ? AND post_id = ?', [commentId, postId]);
        if (!comment) {
            return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
        }

        // 권한 체크: 관리자이거나 댓글 작성자인 경우에만 삭제 가능
        if (userRole !== 'admin' && comment.author_id !== userId) {
            return res.status(403).json({ message: '댓글을 삭제할 권한이 없습니다.' });
        }

        // 트랜잭션 시작
        await db.run('BEGIN TRANSACTION');
        
        try {
            // 댓글 좋아요 삭제
            await db.run('DELETE FROM comment_likes WHERE comment_id = ?', [commentId]);
            
            // 댓글 삭제
            await db.run('DELETE FROM comments WHERE id = ?', [commentId]);
            
            // 트랜잭션 커밋
            await db.run('COMMIT');
            
            res.json({ message: '댓글이 삭제되었습니다.' });
        } catch (error) {
            // 오류 발생 시 롤백
            await db.run('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ message: '댓글 삭제에 실패했습니다.' });
    }
});

// 댓글 수정
router.put('/posts/:postId/comments/:commentId', authenticateToken, async (req, res) => {
    try {
        const { postId, commentId } = req.params;
        const { content } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;

        if (!content) {
            return res.status(400).json({ message: '댓글 내용은 필수입니다.' });
        }

        // 댓글 존재 여부 확인
        const comment = await db.get('SELECT * FROM comments WHERE id = ? AND post_id = ?', [commentId, postId]);
        if (!comment) {
            return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
        }

        // 권한 체크: 관리자이거나 댓글 작성자인 경우에만 수정 가능
        if (userRole !== 'admin' && comment.author_id !== userId) {
            return res.status(403).json({ message: '댓글을 수정할 권한이 없습니다.' });
        }

        // 댓글 수정
        await db.run(
            'UPDATE comments SET content = ? WHERE id = ?',
            [content, commentId]
        );

        // 수정된 댓글 정보 조회
        const updatedComment = await db.get(`
            SELECT c.*, u.name as author_name
            FROM comments c
            LEFT JOIN users u ON c.author_id = u.id
            WHERE c.id = ?
        `, [commentId]);

        res.json(updatedComment);
    } catch (error) {
        console.error('Error updating comment:', error);
        res.status(500).json({ message: '댓글 수정에 실패했습니다.' });
    }
});

// 댓글 좋아요 토글
router.post('/posts/:postId/comments/:commentId/like', authenticateToken, async (req, res) => {
    try {
        const { postId, commentId } = req.params;
        const userId = req.user.id;

        // 댓글 존재 여부 확인
        const comment = await db.get('SELECT * FROM comments WHERE id = ? AND post_id = ?', [commentId, postId]);
        if (!comment) {
            return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
        }

        // 이미 좋아요를 눌렀는지 확인
        const existingLike = await db.get(
            'SELECT * FROM comment_likes WHERE user_id = ? AND comment_id = ?',
            [userId, commentId]
        );

        if (existingLike) {
            // 좋아요 취소
            await db.run('DELETE FROM comment_likes WHERE id = ?', [existingLike.id]);
            res.json({ message: '댓글 좋아요가 취소되었습니다.', isLiked: false });
        } else {
            // 좋아요 추가
            await db.run(
                'INSERT INTO comment_likes (user_id, comment_id) VALUES (?, ?)',
                [userId, commentId]
            );
            res.json({ message: '댓글에 좋아요를 눌렀습니다.', isLiked: true });
        }
    } catch (error) {
        console.error('Error toggling comment like:', error);
        res.status(500).json({ message: '댓글 좋아요 처리에 실패했습니다.' });
    }
});

// 댓글 좋아요 수 조회
router.get('/posts/:postId/comments/:commentId/likes', async (req, res) => {
    try {
        const { postId, commentId } = req.params;

        // 댓글 존재 여부 확인
        const comment = await db.get('SELECT * FROM comments WHERE id = ? AND post_id = ?', [commentId, postId]);
        if (!comment) {
            return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
        }

        // 좋아요 수 조회
        const likeCount = await db.get(
            'SELECT COUNT(*) as count FROM comment_likes WHERE comment_id = ?',
            [commentId]
        );

        res.json({ likeCount: likeCount.count });
    } catch (error) {
        console.error('Error getting comment likes:', error);
        res.status(500).json({ message: '댓글 좋아요 수 조회에 실패했습니다.' });
    }
});

module.exports = router; 