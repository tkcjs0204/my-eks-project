const jwt = require('jsonwebtoken');
const { db } = require('../database');

// 기본 시크릿 키 설정
const DEFAULT_SECRET = 'your-secret-key';

const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ message: '인증이 필요합니다.' });
        }
        
        // JWT_SECRET이 없으면 기본값 사용
        const secret = process.env.JWT_SECRET || DEFAULT_SECRET;
        const decoded = jwt.verify(token, secret);
        
        // 사용자 정보를 데이터베이스에서 가져옴
        const user = await db.get('SELECT id, name, email, role FROM users WHERE id = ?', [decoded.id]);
        
        if (!user) {
            return res.status(401).json({ message: '유효하지 않은 사용자입니다.' });
        }
        
        // 요청 객체에 사용자 정보 추가
        req.user = user;
        next();
    } catch (error) {
        console.error('인증 오류:', error);
        return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
    }
};

const isAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
    }
    next();
};

module.exports = {
    authenticateToken,
    isAdmin
}; 