const { db } = require('./database');

async function checkSchema() {
    try {
        await db.initialize();
        
        // 테이블 목록 조회
        const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
        console.log('\n=== 테이블 목록 ===');
        console.log(tables);
        
        // 각 테이블의 스키마 확인
        for (const table of tables) {
            console.log(`\n=== ${table.name} 테이블 스키마 ===`);
            const schema = await db.all(`PRAGMA table_info(${table.name})`);
            console.log(schema);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

checkSchema(); 