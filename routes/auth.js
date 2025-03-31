const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { db } = require('../database');

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

        jwt.verify(token, 'note4u-secret-key-2024', async (err, decoded) => {
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

// 현재 사용자 정보 API
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: '인증이 필요합니다.' });
        }

        jwt.verify(token, 'note4u-secret-key-2024', async (err, decoded) => {
            if (err) {
                return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
            }

            const user = await db.get('SELECT id, name, email FROM users WHERE id = ?', [decoded.id]);
            if (!user) {
                return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
            }
            res.json(user);
        });
    } catch (error) {
        console.error('사용자 정보 조회 중 오류 발생:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 로그인
router.post('/login', async (req, res) => {
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
            message: '로그인 성공',
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

// 회원가입
router.post('/signup', async (req, res) => {
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

// 로그아웃
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ message: '로그아웃 중 오류가 발생했습니다.' });
        }
        res.json({ message: '로그아웃 성공' });
    });
});

module.exports = router; 