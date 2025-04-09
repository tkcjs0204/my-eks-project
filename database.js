const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        if (Database.instance) {
            return Database.instance;
        }
        Database.instance = this;
        this.db = null;
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) {
            return;
        }

        return new Promise((resolve, reject) => {
            try {
                // 데이터베이스 파일 경로
                const dbPath = path.join(__dirname, 'database.sqlite');
                
                // 데이터베이스 연결
                this.db = new sqlite3.Database(dbPath, (err) => {
                    if (err) {
                        console.error('데이터베이스 연결 오류:', err);
                        reject(err);
                        return;
                    }

                    console.log('데이터베이스가 연결되었습니다.');

                    // 외래 키 제약 조건 활성화
                    this.db.run('PRAGMA foreign_keys = ON', (err) => {
                        if (err) {
                            console.error('외래 키 제약 조건 활성화 오류:', err);
                            reject(err);
                            return;
                        }
                        
                        // 테이블 생성
                        this.createTables()
                            .then(() => {
                                this.isInitialized = true;
                                console.log('데이터베이스가 초기화되었습니다.');
                                resolve();
                            })
                            .catch(err => {
                                console.error('테이블 생성 오류:', err);
                                reject(err);
                            });
                    });
                });
            } catch (error) {
                console.error('데이터베이스 초기화 오류:', error);
                reject(error);
            }
        });
    }

    async createTables() {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                // 사용자 테이블
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username TEXT UNIQUE NOT NULL,
                        email TEXT UNIQUE NOT NULL,
                        password TEXT NOT NULL,
                        name TEXT NOT NULL,
                        bio TEXT,
                        role TEXT DEFAULT 'user',
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);

                // 블로그 게시글 테이블
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS blog_posts (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        title TEXT NOT NULL,
                        content TEXT NOT NULL,
                        author_id INTEGER NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE CASCADE
                    )
                `);

                // 게시글 좋아요 테이블
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS post_likes (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        post_id INTEGER NOT NULL,
                        user_id INTEGER NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (post_id) REFERENCES blog_posts (id) ON DELETE CASCADE,
                        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                        UNIQUE(post_id, user_id)
                    )
                `);

                // 댓글 테이블
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS comments (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        post_id INTEGER NOT NULL,
                        author_id INTEGER NOT NULL,
                        content TEXT NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (post_id) REFERENCES blog_posts (id) ON DELETE CASCADE,
                        FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE CASCADE
                    )
                `);

                // 게시글 태그 테이블
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS post_tags (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        post_id INTEGER NOT NULL,
                        tag_name TEXT NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (post_id) REFERENCES blog_posts (id) ON DELETE CASCADE,
                        UNIQUE(post_id, tag_name)
                    )
                `, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        });
    }

    // Promise 기반 데이터베이스 메서드
    async run(sql, params = []) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve(this);
            });
        });
    }
    
    async get(sql, params = []) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }
    
    async all(sql, params = []) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            } else {
                resolve();
            }
        });
    }

    // 데이터베이스 재설정 (모든 데이터 삭제)
    async reset() {
        try {
            await this.close();
            
            const dbPath = path.join(__dirname, 'database.sqlite');
            if (fs.existsSync(dbPath)) {
                fs.unlinkSync(dbPath);
                console.log('기존 데이터베이스 파일이 삭제되었습니다.');
            }
            
            this.isInitialized = false;
            await this.initialize();
            console.log('데이터베이스가 재설정되었습니다.');
        } catch (error) {
            console.error('데이터베이스 재설정 오류:', error);
            throw error;
        }
    }
}

const database = new Database();

module.exports = {
    initializeDatabase: () => database.initialize(),
    resetDatabase: () => database.reset(),
    db: database
}; 