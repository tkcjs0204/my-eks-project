const sqlite3 = require('sqlite3').verbose();
const path = require('path');

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
                this.db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'), (err) => {
                    if (err) {
                        console.error('데이터베이스 연결 오류:', err);
                        reject(err);
                        return;
                    }

                    console.log('데이터베이스가 연결되었습니다.');

                    // 테이블 생성
                    this.db.serialize(() => {
                        // 사용자 테이블
                        this.db.run(`
                            CREATE TABLE IF NOT EXISTS users (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                name TEXT NOT NULL,
                                email TEXT UNIQUE NOT NULL,
                                password TEXT NOT NULL,
                                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                            )
                        `);

                        // 게시글 테이블
                        this.db.run(`
                            CREATE TABLE IF NOT EXISTS posts (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                title TEXT NOT NULL,
                                content TEXT NOT NULL,
                                author_id INTEGER NOT NULL,
                                tags TEXT,
                                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                FOREIGN KEY (author_id) REFERENCES users (id)
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
                                FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
                                FOREIGN KEY (author_id) REFERENCES users (id)
                            )
                        `);

                        // 좋아요 테이블
                        this.db.run(`
                            CREATE TABLE IF NOT EXISTS likes (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                post_id INTEGER NOT NULL,
                                user_id INTEGER NOT NULL,
                                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
                                FOREIGN KEY (user_id) REFERENCES users (id),
                                UNIQUE(post_id, user_id)
                            )
                        `);

                        // 프로젝트 테이블
                        this.db.run(`
                            CREATE TABLE IF NOT EXISTS projects (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                title TEXT NOT NULL,
                                description TEXT NOT NULL,
                                author_id INTEGER NOT NULL,
                                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                FOREIGN KEY (author_id) REFERENCES users (id)
                            )
                        `);

                        // 프로젝트 댓글 테이블
                        this.db.run(`DROP TABLE IF EXISTS project_comments`);
                        this.db.run(`
                            CREATE TABLE IF NOT EXISTS project_comments (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                project_id INTEGER NOT NULL,
                                author_id INTEGER NOT NULL,
                                content TEXT NOT NULL,
                                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
                                FOREIGN KEY (author_id) REFERENCES users (id)
                            )
                        `);

                        // 외래 키 제약 조건 활성화
                        this.db.run('PRAGMA foreign_keys = ON');
                    });

                    this.isInitialized = true;
                    console.log('데이터베이스가 초기화되었습니다.');
                    resolve();
                });
            } catch (error) {
                console.error('데이터베이스 초기화 오류:', error);
                reject(error);
            }
        });
    }

    // Promise 기반 데이터베이스 메서드
    async run(sql, params = []) {
        if (!this.isInitialized) {
            throw new Error('데이터베이스가 초기화되지 않았습니다.');
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
            throw new Error('데이터베이스가 초기화되지 않았습니다.');
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
            throw new Error('데이터베이스가 초기화되지 않았습니다.');
        }
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    close() {
        if (this.db) {
            this.db.close();
            this.isInitialized = false;
        }
    }
}

const database = new Database();
module.exports = {
    initializeDatabase: () => database.initialize(),
    db: database
}; 