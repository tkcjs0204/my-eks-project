const { db } = require('./database');

async function checkProjectComments() {
    try {
        await db.initialize();
        
        // 프로젝트 3의 댓글 확인
        const comments = await db.all('SELECT * FROM project_comments WHERE project_id = ?', [3]);
        console.log('프로젝트 3의 모든 댓글:', comments);
        
        if (!comments || comments.length === 0) {
            console.log('프로젝트 3에 댓글이 없습니다.');
        } else {
            console.log(`프로젝트 3에 ${comments.length}개의 댓글이 있습니다.`);
            comments.forEach(comment => {
                console.log(`댓글 ID: ${comment.id}, 작성자 ID: ${comment.author_id}, 내용: ${comment.content}`);
            });
        }
        
        // 프로젝트 3이 존재하는지 확인
        const project = await db.get('SELECT * FROM projects WHERE id = ?', [3]);
        if (!project) {
            console.log('프로젝트 3이 존재하지 않습니다.');
        } else {
            console.log('프로젝트 3 정보:', project);
        }
        
        db.close();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkProjectComments(); 