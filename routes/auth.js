const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

// 인증 상태 확인
router.get('/status', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.json({
                isAuthenticated: false,
                user: null
            });
        }

        jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', async (err, decoded) => {
            if (err) {
                return res.json({
                    isAuthenticated: false,
                    user: null
                });
            }

            const user = await db.get('SELECT id, name, email FROM users WHERE id = ?', [decoded.id]);
            if (!user) {
                return res.json({
                    isAuthenticated: false,
                    user: null
                });
            }

            res.json({
                isAuthenticated: true,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email
                }
            });
        });
    } catch (error) {
        console.error('인증 상태 확인 중 오류 발생:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 현재 로그인한 사용자 정보 반환
router.get('/me', authenticateToken, async (req, res) => {
    try {
        // req.user는 authenticateToken 미들웨어에서 설정됨
        const user = await db.get('SELECT id, name, email, role FROM users WHERE id = ?', [req.user.id]);
        
        if (!user) {
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }
        
        res.json(user);
    } catch (error) {
        console.error('사용자 정보 조회 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 로그인
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // 사용자 찾기 (이메일 또는 사용자명으로)
        const user = await db.get('SELECT * FROM users WHERE email = ? OR username = ?', [email, email]);
        if (!user) {
            return res.status(401).json({ message: '이메일/사용자명 또는 비밀번호가 올바르지 않습니다.' });
        }
        
        // 비밀번호 확인
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: '이메일/사용자명 또는 비밀번호가 올바르지 않습니다.' });
        }
        
        // JWT 토큰 생성
        const secret = process.env.JWT_SECRET || 'your-secret-key';
        const token = jwt.sign(
            { id: user.id, email: user.email },
            secret,
            { expiresIn: '24h' }
        );
        
        // 사용자 정보에서 비밀번호 제외
        const { password: _, ...userWithoutPassword } = user;
        
        res.json({
            token,
            user: userWithoutPassword
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: '로그인에 실패했습니다.' });
    }
});

// 회원가입
router.post('/register', async (req, res) => {
    try {
        const { username, name, email, password } = req.body;
        
        // 이메일과 사용자명 중복 체크
        const existingUser = await db.get('SELECT * FROM users WHERE email = ? OR username = ?', [email, username]);
        if (existingUser) {
            if (existingUser.email === email) {
                return res.status(400).json({ message: '이미 사용중인 이메일입니다.' });
            } else {
                return res.status(400).json({ message: '이미 사용중인 사용자명입니다.' });
            }
        }
        
        // 비밀번호 해시화
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 사용자 생성
        const result = await db.run(
            'INSERT INTO users (username, name, email, password) VALUES (?, ?, ?, ?)',
            [username, name, email, hashedPassword]
        );
        
        const user = {
            id: result.lastID,
            username,
            name,
            email
        };
        
        // JWT 토큰 생성
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );
        
        res.json({ token, user });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 로그아웃
router.post('/logout', (req, res) => {
    res.json({ message: '로그아웃 성공' });
});

// 비밀번호 변경
router.post('/change-password', authenticateToken, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        const userId = req.user.id;

        // 현재 사용자 정보 조회
        const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
        if (!user) {
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }

        // 현재 비밀번호 확인
        const isPasswordValid = await bcrypt.compare(current_password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: '현재 비밀번호가 일치하지 않습니다.' });
        }

        // 새 비밀번호 해시
        const hashedPassword = await bcrypt.hash(new_password, 10);

        // 비밀번호 업데이트
        await db.run(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, userId]
        );

        res.json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
    } catch (error) {
        console.error('비밀번호 변경 중 오류 발생:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

module.exports = router; 