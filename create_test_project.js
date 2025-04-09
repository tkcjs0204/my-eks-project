const { db } = require('./database');

async function createTestProject() {
    try {
        await db.initialize();
        
        // 테스트 사용자 생성 (없는 경우)
        const testUser = await db.get('SELECT * FROM users WHERE email = ?', ['test@example.com']);
        let userId;
        
        if (!testUser) {
            const result = await db.run(`
                INSERT INTO users (name, email, password)
                VALUES (?, ?, ?)
            `, ['테스트 사용자', 'test@example.com', 'password123']);
            userId = result.lastID;
            console.log('테스트 사용자가 생성되었습니다. ID:', userId);
        } else {
            userId = testUser.id;
            console.log('기존 테스트 사용자를 사용합니다. ID:', userId);
        }
        
        // 테스트 프로젝트 생성
        const result = await db.run(`
            INSERT INTO projects (title, description, leader_id, status, github_url)
            VALUES (?, ?, ?, ?, ?)
        `, ['테스트 프로젝트', '테스트 프로젝트 설명입니다.', userId, '진행중', 'https://github.com/test/project']);
        
        console.log('테스트 프로젝트가 생성되었습니다. ID:', result.lastID);
        
        // 생성된 프로젝트 확인
        const project = await db.get('SELECT * FROM projects WHERE id = ?', [result.lastID]);
        console.log('생성된 프로젝트 정보:', project);
        
        // 프로젝트 멤버로 추가
        await db.run(`
            INSERT INTO project_members (project_id, user_id, role)
            VALUES (?, ?, ?)
        `, [result.lastID, userId, '리더']);
        
        console.log('프로젝트 멤버가 추가되었습니다.');
    } catch (error) {
        console.error('Error:', error);
    }
}

createTestProject(); 