const { db } = require('./database');

async function checkComments() {
    try {
        await db.initialize();
        
        const comments = await db.all('SELECT * FROM project_comments WHERE project_id = ?', [1]);
        console.log('프로젝트 1의 모든 댓글:', comments);
        
        if (!comments || comments.length === 0) {
            console.log('댓글이 없습니다.');
        }
        
        db.close();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkComments(); 