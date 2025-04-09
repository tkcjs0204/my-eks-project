const { db } = require('./database');

async function migrateDatabase() {
    try {
        // 데이터베이스 초기화
        await db.initialize();
        console.log('데이터베이스가 초기화되었습니다.');

        // 임시 테이블 생성
        await db.run(`
            CREATE TABLE IF NOT EXISTS users_temp (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE,
                password TEXT NOT NULL,
                name TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('임시 테이블이 생성되었습니다.');

        // 기존 데이터를 임시 테이블로 복사
        await db.run(`
            INSERT INTO users_temp (id, username, password, name, role, created_at)
            SELECT id, username, password, name, role, created_at FROM users
        `);
        console.log('기존 데이터가 임시 테이블로 복사되었습니다.');

        // 기존 테이블 삭제
        await db.run('DROP TABLE users');
        console.log('기존 테이블이 삭제되었습니다.');

        // 임시 테이블을 users로 이름 변경
        await db.run('ALTER TABLE users_temp RENAME TO users');
        console.log('임시 테이블이 users로 이름이 변경되었습니다.');

        // 프로젝트 테이블 생성
        await db.run(`
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                leader_id INTEGER NOT NULL,
                status TEXT CHECK(status IN ('계획중', '진행중', '완료')) DEFAULT '계획중',
                github_url TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('프로젝트 테이블이 생성되었습니다.');

        // 프로젝트 멤버 테이블 생성
        await db.run(`
            CREATE TABLE IF NOT EXISTS project_members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                role TEXT CHECK(role IN ('리더', '멤버')) DEFAULT '멤버',
                joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(project_id, user_id)
            )
        `);
        console.log('프로젝트 멤버 테이블이 생성되었습니다.');

        // 프로젝트 댓글 테이블 생성
        await db.run(`
            CREATE TABLE IF NOT EXISTS project_comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                author_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('프로젝트 댓글 테이블이 생성되었습니다.');

        console.log('데이터베이스 마이그레이션이 완료되었습니다.');
    } catch (error) {
        console.error('마이그레이션 중 오류 발생:', error);
        throw error;
    }
}

migrateDatabase(); 