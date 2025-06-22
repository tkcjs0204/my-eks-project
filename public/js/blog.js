const blog = {
    showBlogPage: async function() {
        document.getElementById('main-content').innerHTML = `
            <div class="container mt-4">
                <h1 class="mb-4">블로그</h1>
                <div id="posts-container" class="row"></div>
            </div>
        `;
        // ... 기존 showBlogPage 함수 내용은 그대로 ...
    },

    showNewPostForm: function() {
        // ... 기존 showNewPostForm 함수 내용은 그대로 ...
    },

    showEditPostForm: async function(postId) {
        // ... 기존 showEditPostForm 함수 내용은 그대로 ...
    },

    showPostDetail: async function(postId) {
        // ... 기존 showPostDetail 함수 내용은 그대로 ...
    }

    // home 함수 및 DOMContentLoaded, 라우터 관련 코드 모두 삭제됨
}; 