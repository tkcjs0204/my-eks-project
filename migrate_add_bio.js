const { db } = require('./database');

async function migrateAddBio() {
    try {
        // 데이터베이스 초기화
        await db.initialize();
        console.log('데이터베이스가 초기화되었습니다.');

        // bio 컬럼 추가
        await db.run(`
            ALTER TABLE users ADD COLUMN bio TEXT;
        `);
        console.log('bio 컬럼이 추가되었습니다.');

        console.log('마이그레이션이 완료되었습니다.');
    } catch (error) {
        console.error('마이그레이션 중 오류 발생:', error);
        throw error;
    }
}

migrateAddBio().catch(console.error); 