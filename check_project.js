const { db } = require('./database');

async function checkProject() {
    try {
        await db.initialize();
        
        // 프로젝트 테이블 구조 확인
        console.log('\n=== 프로젝트 테이블 구조 ===');
        const tableInfo = await db.all("PRAGMA table_info(projects);");
        console.log('projects 테이블 구조:', JSON.stringify(tableInfo, null, 2));
        
        // 프로젝트 2 확인
        console.log('\n=== 프로젝트 2 확인 ===');
        const project = await db.get('SELECT * FROM projects WHERE id = ?', [2]);
        console.log('프로젝트 2:', project);
        
        if (!project) {
            console.log('프로젝트 2가 존재하지 않습니다.');
        }
        
        db.close();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkProject(); 