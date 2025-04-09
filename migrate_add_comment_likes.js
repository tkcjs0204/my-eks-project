const { db } = require('./database');

async function migrate() {
    try {
        console.log('Starting migration: Adding comment_likes table...');
        
        // 트랜잭션 시작
        await db.run('BEGIN TRANSACTION');
        
        try {
            // comment_likes 테이블 생성
            await db.run(`
                CREATE TABLE IF NOT EXISTS comment_likes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    comment_id INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    FOREIGN KEY (comment_id) REFERENCES comments(id),
                    UNIQUE(user_id, comment_id)
                )
            `);
            
            // 트랜잭션 커밋
            await db.run('COMMIT');
            console.log('Migration completed successfully!');
        } catch (error) {
            // 오류 발생 시 롤백
            await db.run('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        // 데이터베이스 연결 종료
        db.close();
    }
}

migrate(); 