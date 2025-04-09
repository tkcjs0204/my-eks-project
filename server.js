const express = require('express');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initializeDatabase, db } = require('./database');
const { authenticateToken } = require('./middleware/authMiddleware');
const Post = require('./models/post');

const app = express();
const port = process.env.PORT || 3000;

// 보안 미들웨어
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'", "https:", "http:", "data:", "blob:"],
                scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:", "http:", "blob:"],
                scriptSrcAttr: ["'unsafe-inline'"],
                scriptSrcElem: ["'self'", "'unsafe-inline'", "https:", "http:", "blob:"],
                connectSrc: ["'self'", "https:", "http:", "ws:", "wss:"],
                styleSrc: ["'self'", "'unsafe-inline'", "https:", "http:"],
                styleSrcElem: ["'self'", "'unsafe-inline'", "https:", "http:"],
                imgSrc: ["'self'", "data:", "https:", "http:", "blob:"],
                fontSrc: ["'self'", "data:", "https:", "http:"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'", "data:", "https:", "http:"],
                frameSrc: ["'self'"],
                childSrc: ["'self'", "blob:"],
                workerSrc: ["'self'", "blob:"],
                frameAncestors: ["'self'"],
                formAction: ["'self'"],
                upgradeInsecureRequests: null,
            },
        },
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: false,
        crossOriginOpenerPolicy: false,
    })
);

// CORS 설정
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 요청 제한 설정
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15분
    max: 1000, // IP당 최대 요청 수 증가
    message: { message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.' }
});

// API 경로별 rate limit 설정
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15분
    max: 100, // 인증 요청 제한 증가
    message: { message: '너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요.' }
});

const postLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15분
    max: 200, // 게시글 작성 제한
    message: { message: '너무 많은 게시글 작성 요청이 있었습니다. 잠시 후 다시 시도해주세요.' }
});

app.use('/api/auth', authLimiter);
app.use('/api/blog/posts', postLimiter);
app.use('/api/', limiter);

// 압축 미들웨어
app.use(compression());

// JSON 파싱
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 정적 파일 서빙 설정
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1d',
    etag: true,
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
        // 캐시 설정
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        } else {
            res.setHeader('Cache-Control', 'public, max-age=86400');
        }
    }
}));

// API 라우트 설정
const authRoutes = require('./routes/auth');
const blogRoutes = require('./routes/blog');
const projectRoutes = require('./routes/projects');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');

// API 라우트 설정
app.use('/api/auth', authRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// 블로그 게시글 삭제
app.delete('/api/blog/posts/:id', async (req, res) => {
    try {
        const postId = req.params.id;
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ message: '인증이 필요합니다.' });
        }

        // 게시글 찾기
        const post = await db.get('SELECT * FROM posts WHERE id = ?', [postId]);
        if (!post) {
            return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
        }

        // 작성자 확인
        if (post.author_id !== req.user.id) {
            return res.status(403).json({ message: '게시글을 삭제할 권한이 없습니다.' });
        }

        // 게시글 삭제
        await db.run('DELETE FROM posts WHERE id = ?', [postId]);
        res.json({ message: '게시글이 삭제되었습니다.' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 블로그 게시글 수정
app.put('/api/blog/posts/:id', async (req, res) => {
    try {
        const postId = req.params.id;
        const { title, content } = req.body;
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ message: '인증이 필요합니다.' });
        }

        // 게시글 찾기
        const post = await db.get('SELECT * FROM posts WHERE id = ?', [postId]);
        if (!post) {
            return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
        }

        // 작성자 확인
        if (post.author_id !== req.user.id) {
            return res.status(403).json({ message: '게시글을 수정할 권한이 없습니다.' });
        }

        // 게시글 수정
        await db.run(
            'UPDATE posts SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [title, content, postId]
        );

        const updatedPost = await db.get('SELECT * FROM posts WHERE id = ?', [postId]);
        res.json({ message: '게시글이 수정되었습니다.', post: updatedPost });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// API 404 처리
app.use('/api/*', (req, res) => {
    res.status(404).json({ message: '요청한 리소스를 찾을 수 없습니다.' });
});

// 에러 처리 미들웨어
app.use((err, req, res, next) => {
    console.error(err.stack);
    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production' 
        ? '서버 오류가 발생했습니다.' 
        : err.message;
    res.status(statusCode).json({ message });
});

// SPA를 위한 라우팅 (마지막에 설정)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 서버 시작
async function startServer() {
    try {
        // 데이터베이스 초기화
        await initializeDatabase();
        
        const server = app.listen(port, () => {
            console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
        });

        // 에러 처리
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.log(`포트 ${port}가 이미 사용 중입니다. 다른 포트를 시도합니다...`);
                server.close();
                server.listen(0); // 사용 가능한 다른 포트 사용
            } else {
                console.error('서버 에러:', error);
            }
        });
    } catch (error) {
        console.error('서버 시작 실패:', error);
        process.exit(1);
    }
}

// 프로세스 종료 시 정리
process.on('SIGTERM', () => {
    console.log('SIGTERM 신호를 받았습니다. 서버를 종료합니다.');
    process.exit(0);
});

startServer();