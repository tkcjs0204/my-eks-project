const { db } = require('./database');
const fs = require('fs');
const path = require('path');

async function initializeDatabase() {
    try {
        await db.initialize();
        
        // schema.sql 파일 읽기
        const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        
        // SQL 문 분리 (주석 처리된 부분도 포함)
        const statements = schema
            .split(';')  // 세미콜론으로 분리
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);  // 빈 문장만 제거

        // 각 SQL 문 실행
        for (const statement of statements) {
            try {
                await db.run(statement);
                console.log('SQL 실행 성공:', statement.substring(0, 50) + '...');
            } catch (error) {
                console.error('SQL 실행 실패:', statement.substring(0, 50) + '...');
                console.error('에러:', error);
                // 에러가 발생해도 계속 진행
            }
        }
        
        console.log('데이터베이스 초기화가 완료되었습니다.');
    } catch (error) {
        console.error('데이터베이스 초기화 중 오류 발생:', error);
        process.exit(1);
    }
}

initializeDatabase(); 