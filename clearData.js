const { db } = require('./database');

async function clearData() {
    try {
        // 데이터베이스 초기화
        await db.initialize();

        // 데이터 삭제
        console.log('데이터 삭제를 시작합니다...');
        
        // 외래 키 제약 조건 비활성화
        await db.run('PRAGMA foreign_keys = OFF;');
        
        // 데이터 삭제
        await db.run('DELETE FROM comments;');
        console.log('댓글 데이터가 삭제되었습니다.');
        
        await db.run('DELETE FROM likes;');
        console.log('좋아요 데이터가 삭제되었습니다.');
        
        await db.run('DELETE FROM posts;');
        console.log('게시글 데이터가 삭제되었습니다.');
        
        await db.run('DELETE FROM projects;');
        console.log('프로젝트 데이터가 삭제되었습니다.');
        
        // 외래 키 제약 조건 다시 활성화
        await db.run('PRAGMA foreign_keys = ON;');
        
        console.log('모든 데이터가 성공적으로 삭제되었습니다.');
        
        // 데이터베이스 연결 종료
        db.close();
    } catch (error) {
        console.error('데이터 삭제 중 오류 발생:', error);
    }
}

clearData(); 