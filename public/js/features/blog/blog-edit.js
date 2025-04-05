// EasyMDE 에디터 초기화
const easyMDE = new EasyMDE({
    element: document.getElementById('content'),
    spellChecker: false,
    status: false,
    toolbar: [
        'bold', 'italic', 'heading', '|',
        'quote', 'unordered-list', 'ordered-list', '|',
        'link', 'image', '|',
        'preview', 'side-by-side', 'fullscreen', '|',
        'guide'
    ],
    previewRender: function(plainText, preview) {
        // 코드 하이라이팅 설정
        marked.setOptions({
            highlight: function(code, lang) {
                if (Prism && lang) {
                    try {
                        return Prism.highlight(code, Prism.languages[lang], lang);
                    } catch (e) {
                        console.warn('언어 하이라이팅 실패:', e);
                    }
                }
                return code;
            }
        });

        // 마크다운을 HTML로 변환
        const html = marked(plainText);
        preview.innerHTML = html;
    }
});

// 폼 제출 처리
document.getElementById('articleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('title').value.trim();
    const content = easyMDE.value();
    const tags = document.getElementById('tags').value.trim().split(',').map(tag => tag.trim()).filter(tag => tag);
    
    if (!title || !content) {
        alert('제목과 내용을 모두 입력해주세요.');
        return;
    }

    try {
        const postId = window.location.pathname.split('/').pop();
        const url = postId === 'new' ? '/blog' : `/blog/${postId}`;
        const method = postId === 'new' ? 'POST' : 'PUT';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ title, content, tags })
        });

        if (!response.ok) {
            throw new Error('저장에 실패했습니다.');
        }

        const data = await response.json();
        window.location.href = `/blog/${data.id}`;
    } catch (error) {
        alert(error.message);
    }
}); 