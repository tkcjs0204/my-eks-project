const { db } = require('./database');

async function checkComments() {
    try {
        await db.initialize();
        
        // 테이블 존재 여부 확인
        console.log('\n=== 테이블 존재 여부 확인 ===');
        const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='project_comments';");
        console.log('project_comments 테이블 존재 여부:', tables.length > 0);
        
        if (tables.length > 0) {
            // 테이블 구조 확인
            console.log('\n=== 테이블 구조 확인 ===');
            const tableInfo = await db.all("PRAGMA table_info(project_comments);");
            console.log('project_comments 테이블 구조:', JSON.stringify(tableInfo, null, 2));
            
            // 모든 댓글 확인
            console.log('\n=== 모든 댓글 확인 ===');
            const allComments = await db.all('SELECT * FROM project_comments');
            console.log('전체 댓글:', JSON.stringify(allComments, null, 2));
            
            // 프로젝트 2의 댓글 확인
            console.log('\n=== 프로젝트 2의 댓글 확인 ===');
            const projectComments = await db.all(`
                SELECT 
                    c.*,
                    u.name as author_name
                FROM project_comments c
                LEFT JOIN users u ON c.author_id = u.id
                WHERE c.project_id = ?
                ORDER BY c.created_at DESC
            `, [2]);
            console.log('프로젝트 2의 댓글:', JSON.stringify(projectComments, null, 2));
        } else {
            console.log('project_comments 테이블이 존재하지 않습니다.');
        }
        
        db.close();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkComments(); 