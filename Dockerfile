# Node.js 공식 이미지 사용 (linux 기반)
FROM node:18

# 앱 디렉토리 생성
WORKDIR /app

# package.json과 package-lock.json 복사 (의존성 설치용)
COPY package*.json ./

# 의존성 설치 (도커 내부 Linux 환경에서 설치됨)
RUN npm install

# 앱 소스 복사 (node_modules 제외)
COPY . .

# 앱 실행 포트 지정
EXPOSE 3000

# 앱 실행
CMD ["node", "server.js"]