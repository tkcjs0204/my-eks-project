const { db } = require('./database');
const bcrypt = require('bcrypt');

async function resetPassword(email, newPassword) {
    try {
        // 데이터베이스 초기화
        await db.initialize();
        console.log('데이터베이스가 초기화되었습니다.');

        // 사용자 찾기
        const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) {
            console.log(`이메일이 "${email}"인 사용자를 찾을 수 없습니다.`);
            return;
        }

        // 새 비밀번호 해시화
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // 비밀번호 업데이트
        await db.run('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]);
        console.log(`\n사용자 "${user.name}"(${user.email})의 비밀번호가 재설정되었습니다.`);

        // 변경 확인
        const updatedUser = await db.get('SELECT id, name, email FROM users WHERE email = ?', [email]);
        console.log('\n변경된 사용자 정보:');
        console.table([updatedUser]);

    } catch (error) {
        console.error('오류 발생:', error);
    } finally {
        process.exit(0);
    }
}

// 비밀번호 재설정 실행
resetPassword('gihyunkim0204@gmail.com', '1234'); 