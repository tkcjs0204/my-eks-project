require('dotenv').config();
const { Sequelize } = require('sequelize');
const path = require('path');

// SQLite 연결 설정
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'database.sqlite'),
    logging: false
});

// 모델 정의
const User = sequelize.define('User', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: Sequelize.STRING,
        allowNull: false
    },
    email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: Sequelize.STRING,
        allowNull: false
    },
    role: {
        type: Sequelize.STRING,
        defaultValue: 'user'
    },
    bio: {
        type: Sequelize.TEXT,
        allowNull: true
    }
});

const Post = sequelize.define('Post', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: Sequelize.STRING,
        allowNull: false
    },
    content: {
        type: Sequelize.TEXT,
        allowNull: false
    }
});

const Project = sequelize.define('Project', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: Sequelize.STRING,
        allowNull: false
    },
    description: {
        type: Sequelize.TEXT,
        allowNull: false
    },
    technologies: {
        type: Sequelize.JSON,
        allowNull: true
    },
    github_url: {
        type: Sequelize.STRING,
        allowNull: true
    },
    demo_url: {
        type: Sequelize.STRING,
        allowNull: true
    }
});

const Comment = sequelize.define('Comment', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    content: {
        type: Sequelize.TEXT,
        allowNull: false
    }
});

const Like = sequelize.define('Like', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    }
});

// 관계 설정
User.hasMany(Post);
Post.belongsTo(User);

User.hasMany(Project);
Project.belongsTo(User);

User.hasMany(Comment);
Comment.belongsTo(User);

Post.hasMany(Comment);
Comment.belongsTo(Post);

User.hasMany(Like);
Like.belongsTo(User);

Post.hasMany(Like);
Like.belongsTo(Post);

// 데이터베이스 초기화 함수
async function initializeDatabase() {
    try {
        await sequelize.authenticate();
        console.log('sqlite 연결 성공');
        
        // 테이블 생성
        await sequelize.sync({ alter: true });
        console.log('모든 테이블이 성공적으로 생성되었습니다.');
    } catch (error) {
        console.error('데이터베이스 초기화 중 오류 발생:', error);
        throw error;
    }
}

module.exports = {
    sequelize,
    User,
    Post,
    Project,
    Comment,
    Like,
    initializeDatabase
}; 