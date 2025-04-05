const { db } = require('./database');

async function checkBlogComments() {
    try {
        await db.initialize();
        
        // 게시글 3의 댓글 확인
        const comments = await db.all(`
            SELECT c.*, u.name as author_name 
            FROM comments c
            LEFT JOIN users u ON c.author_id = u.id
            WHERE c.post_id = ?
        `, [3]);
        console.log('게시글 3의 모든 댓글:', comments);
        
        if (!comments || comments.length === 0) {
            console.log('게시글 3에 댓글이 없습니다.');
        } else {
            console.log(`게시글 3에 ${comments.length}개의 댓글이 있습니다.`);
            comments.forEach(comment => {
                console.log(`댓글 ID: ${comment.id}, 작성자: ${comment.author_name}, 내용: ${comment.content}`);
            });
        }
        
        // 게시글 3이 존재하는지 확인
        const post = await db.get(`
            SELECT p.*, u.name as author_name 
            FROM posts p
            LEFT JOIN users u ON p.author_id = u.id
            WHERE p.id = ?
        `, [3]);
        if (!post) {
            console.log('게시글 3이 존재하지 않습니다.');
        } else {
            console.log('게시글 3 정보:', post);
        }
        
        db.close();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkBlogComments(); 