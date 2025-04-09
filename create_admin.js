const { db } = require('./database');
const bcrypt = require('bcrypt');

async function createAdmin() {
    try {
        // 데이터베이스 초기화
        await db.initialize();
        console.log('데이터베이스가 초기화되었습니다.');

        const email = 'gihyunkim0204@gmail.com';
        const username = 'admin';
        const name = '김기현';
        const password = '1234';
        const role = 'admin';

        // 비밀번호 해시화
        const hashedPassword = await bcrypt.hash(password, 10);

        // 관리자 계정 생성
        const result = await db.run(
            'INSERT INTO users (username, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
            [username, name, email, hashedPassword, role]
        );

        console.log('\n관리자 계정이 생성되었습니다.');
        
        // 생성된 계정 확인
        const user = await db.get('SELECT id, username, name, email, role FROM users WHERE email = ?', [email]);
        console.log('\n생성된 계정 정보:');
        console.table([user]);

    } catch (error) {
        console.error('오류 발생:', error);
    } finally {
        process.exit(0);
    }
}

createAdmin(); 