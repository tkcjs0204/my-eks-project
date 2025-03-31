const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { db } = require('./database');
const authRouter = require('./routes/auth');
const blogRouter = require('./routes/blog');
const projectRouter = require('./routes/project');

const app = express();
const PORT = process.env.PORT || 3000;

// JWT 토큰 검증 미들웨어
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: '인증이 필요합니다.' });
  }

  jwt.verify(token, 'note4u-secret-key-2024', (err, user) => {
    if (err) {
      return res.status(403).json({ message: '유효하지 않은 토큰입니다.' });
    }
    req.user = user;
    next();
  });
};

// 미들웨어 설정
app.use(express.json());
app.use(express.static('public'));
app.use(express.static('views'));

// 메인 페이지
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// 로그인 페이지
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// 회원가입 페이지
app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'signup.html'));
});

// 현재 사용자 정보 API
app.get('/api/user/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.get('SELECT id, name, email FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }
    res.json(user);
  } catch (error) {
    console.error('사용자 정보 조회 중 오류 발생:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 회원가입 처리
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 이메일 중복 확인
    const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ message: '이미 사용 중인 이메일입니다.' });
    }

    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(password, 10);

    // 사용자 생성
    const result = await db.run(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    );

    res.status(201).json({ message: '회원가입이 완료되었습니다.' });
  } catch (error) {
    console.error('회원가입 중 오류 발생:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 로그인 처리
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 사용자 조회
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    // 비밀번호 확인
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    // JWT 토큰 생성
    const token = jwt.sign(
      { id: user.id, email: user.email },
      'note4u-secret-key-2024',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('로그인 중 오류 발생:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 로그아웃
app.get('/logout', (req, res) => {
  res.redirect('/');
});

// 블로그 관련 라우트
app.get('/blog', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'blog.html'));
});

app.get('/blog/new', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'blog-new.html'));
});

app.get('/blog/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'blog-detail.html'));
});

// 블로그 API 엔드포인트
app.get('/api/blog/posts', async (req, res) => {
    try {
        const posts = await db.all(`
            SELECT b.*, u.name as author_name, u.email as author_email,
                   COUNT(DISTINCT l.id) as like_count,
                   COUNT(DISTINCT c.id) as comment_count
            FROM blog_posts b
            LEFT JOIN users u ON b.user_id = u.id
            LEFT JOIN likes l ON b.id = l.post_id
            LEFT JOIN comments c ON b.id = c.post_id
            GROUP BY b.id
            ORDER BY b.created_at DESC
        `);
        res.json(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ message: '게시글을 불러오는데 실패했습니다.' });
    }
});

app.get('/api/blog/posts/:id', async (req, res) => {
    try {
        const post = await db.get(`
            SELECT b.*, u.name as author_name, u.email as author_email,
                   COUNT(DISTINCT l.id) as like_count,
                   COUNT(DISTINCT c.id) as comment_count
            FROM blog_posts b
            LEFT JOIN users u ON b.user_id = u.id
            LEFT JOIN likes l ON b.id = l.post_id
            LEFT JOIN comments c ON b.id = c.post_id
            WHERE b.id = ?
            GROUP BY b.id
        `, [req.params.id]);
        
        if (!post) {
            return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
        }
        
        // 태그 데이터 처리
        if (post.tags) {
            try {
                post.tags = JSON.parse(post.tags);
            } catch (error) {
                console.error('Error parsing tags:', error);
                post.tags = [];
            }
        } else {
            post.tags = [];
        }
        
        res.json(post);
    } catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).json({ message: '게시글을 불러오는데 실패했습니다.' });
    }
});

app.post('/api/blog/posts', authenticateToken, async (req, res) => {
    const { title, content, tags } = req.body;
    
    if (!title || !content) {
        return res.status(400).json({ message: '제목과 내용은 필수입니다.' });
    }

    try {
        const result = await db.run(
            'INSERT INTO blog_posts (title, content, tags, user_id, created_at) VALUES (?, ?, ?, ?, ?)',
            [title, content, JSON.stringify(tags), req.user.id, new Date().toISOString()]
        );

        res.status(201).json({
            id: result.lastID,
            message: '게시글이 성공적으로 작성되었습니다.'
        });
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ message: '게시글 작성에 실패했습니다.' });
    }
});

// 프로젝트 관련 라우트
app.get('/project', async (req, res) => {
    try {
        const projects = await db.all(`
            SELECT p.*, u.name as leader_name,
                   (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
            FROM projects p
            LEFT JOIN users u ON p.leader_id = u.id
            ORDER BY p.created_at DESC
        `);
        res.json(projects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API 라우트 설정
app.use('/api/auth', authRouter);
app.use('/api/blog', blogRouter);
app.use('/api/project', projectRouter);

// 정적 파일 제공
app.use(express.static('public'));

// 모든 다른 요청에 대해 index.html 제공
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 에러 핸들링
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '서버 오류가 발생했습니다.' });
});

app.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
