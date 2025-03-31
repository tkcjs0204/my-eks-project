// Markdown 에디터 초기화
let easyMDE = new EasyMDE({
    element: document.getElementById('content'),
    spellChecker: false,
    autosave: {
        enabled: true,
        uniqueId: 'blog-post-content',
        delay: 1000,
    },
    placeholder: '마크다운으로 작성해보세요...',
});

// 폼 제출 처리
document.getElementById('blogPostForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('title').value;
    const content = easyMDE.value();
    const tags = document.getElementById('tags').value
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('로그인이 필요합니다.');
            window.location.href = '/login';
            return;
        }

        const response = await fetch('/api/blog/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title,
                content,
                tags
            })
        });

        if (response.ok) {
            const result = await response.json();
            alert('글이 성공적으로 저장되었습니다.');
            window.location.href = `/blog/${result.id}`;
        } else {
            const error = await response.json();
            alert(error.message || '글 저장에 실패했습니다.');
        }
    } catch (error) {
        console.error('Error saving post:', error);
        alert('글 저장 중 오류가 발생했습니다.');
    }
}); 