    const { db } = require('./database');

async function checkUsers() {
    try {
        // 데이터베이스 초기화
        await db.initialize();
        console.log('데이터베이스가 초기화되었습니다.');

        // 모든 사용자 조회
        const users = await db.all('SELECT id, username, name, email, role FROM users');
        
        if (users.length === 0) {
            console.log('사용자 테이블이 비어 있습니다.');
        } else {
            console.log('\n=== 사용자 목록 ===');
            console.table(users);
        }

    } catch (error) {
        console.error('오류 발생:', error);
    } finally {
        process.exit(0);
    }
}

checkUsers(); 

// 첫 번째 댓글의 HTML 구조 확인
const firstComment = document.querySelector('[id^="comment-"]');
if (firstComment) {
    console.log('첫 번째 댓글의 HTML 구조:', firstComment.outerHTML);
} else {
    console.log('댓글이 없습니다.');
} 

// 현재 페이지의 postId 추출
const postId = window.location.pathname.split('/').pop();

// 댓글 목록 컨테이너 확인
document.getElementById('comments-list') ? console.log('댓글 목록 컨테이너를 찾았습니다.') : console.log('댓글 목록 컨테이너가 없습니다.');

// loadComments 함수로 댓글 재로드
if (postId && loadComments) {
    loadComments(postId).then(() => {
        console.log('댓글을 다시 로드했습니다.');
    }).catch(error => {
        console.error('댓글 로드 실패:', error);
    });
} 