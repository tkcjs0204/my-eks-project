const fs = require('fs');
const path = require('path');
const { db } = require('./database');

async function resetDatabase() {
    try {
        // 데이터베이스 파일 삭제
        const dbPath = path.join(__dirname, 'database.sqlite');
        if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
            console.log('기존 데이터베이스 파일이 삭제되었습니다.');
        }

        // 데이터베이스 초기화
        await db.initialize();
        console.log('데이터베이스가 초기화되었습니다.');

        // 테이블 구조 확인
        const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table';");
        console.log('\n생성된 테이블 목록:', tables.map(t => t.name));

        // project_comments 테이블 구조 확인
        const tableInfo = await db.all("PRAGMA table_info(project_comments);");
        console.log('\nproject_comments 테이블 구조:', JSON.stringify(tableInfo, null, 2));

        db.close();
    } catch (error) {
        console.error('Error:', error);
    }
}

resetDatabase(); 