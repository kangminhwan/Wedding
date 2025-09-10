const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;
const MESSAGES_FILE = 'messages.json';

// CORS 헤더 설정
function setCORSHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// 메시지 파일 읽기
function getMessages() {
    try {
        if (fs.existsSync(MESSAGES_FILE)) {
            const data = fs.readFileSync(MESSAGES_FILE, 'utf8');
            return JSON.parse(data);
        }
        return [];
    } catch (error) {
        console.error('Error reading messages:', error);
        return [];
    }
}

// 메시지 파일 저장
function saveMessages(messages) {
    try {
        fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving messages:', error);
        return false;
    }
}

// 정적 파일 서비스
function serveStaticFile(req, res, filePath) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('File not found');
            return;
        }

        const ext = path.extname(filePath);
        let contentType = 'text/html';
        
        switch (ext) {
            case '.css': contentType = 'text/css'; break;
            case '.js': contentType = 'application/javascript'; break;
            case '.json': contentType = 'application/json'; break;
            case '.png': contentType = 'image/png'; break;
            case '.jpg': contentType = 'image/jpeg'; break;
            case '.mp3': contentType = 'audio/mpeg'; break;
            case '.mp4': contentType = 'video/mp4'; break;
        }

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    setCORSHeaders(res);

    // OPTIONS 요청 처리 (CORS preflight)
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // API 요청 처리
    if (pathname === '/api' || pathname === '/api.php') {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            res.setHeader('Content-Type', 'application/json');

            try {
                switch (req.method) {
                    case 'GET':
                        // 모든 메시지 반환
                        const messages = getMessages();
                        res.writeHead(200);
                        res.end(JSON.stringify(messages));
                        break;

                    case 'POST':
                        // 새 메시지 추가
                        const input = JSON.parse(body);
                        
                        if (input.name && input.message && input.password) {
                            const messages = getMessages();
                            
                            const newMessage = {
                                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                                name: input.name.trim(),
                                message: input.message.trim(),
                                password: input.password, // 간단한 구현을 위해 평문 저장
                                date: new Date().toISOString()
                            };
                            
                            messages.unshift(newMessage);
                            
                            if (saveMessages(messages)) {
                                res.writeHead(200);
                                res.end(JSON.stringify({ success: true, message: 'Message added successfully' }));
                            } else {
                                res.writeHead(500);
                                res.end(JSON.stringify({ success: false, message: 'Failed to save message' }));
                            }
                        } else {
                            res.writeHead(400);
                            res.end(JSON.stringify({ success: false, message: 'Missing required fields' }));
                        }
                        break;

                    case 'DELETE':
                        // 메시지 삭제
                        const deleteInput = JSON.parse(body);
                        
                        if (deleteInput.id && deleteInput.password) {
                            const messages = getMessages();
                            const messageIndex = messages.findIndex(msg => msg.id === deleteInput.id);
                            
                            if (messageIndex !== -1) {
                                if (messages[messageIndex].password === deleteInput.password) {
                                    messages.splice(messageIndex, 1);
                                    
                                    if (saveMessages(messages)) {
                                        res.writeHead(200);
                                        res.end(JSON.stringify({ success: true, message: 'Message deleted successfully' }));
                                    } else {
                                        res.writeHead(500);
                                        res.end(JSON.stringify({ success: false, message: 'Failed to save changes' }));
                                    }
                                } else {
                                    res.writeHead(401);
                                    res.end(JSON.stringify({ success: false, message: 'Invalid password' }));
                                }
                            } else {
                                res.writeHead(404);
                                res.end(JSON.stringify({ success: false, message: 'Message not found' }));
                            }
                        } else {
                            res.writeHead(400);
                            res.end(JSON.stringify({ success: false, message: 'Missing required fields' }));
                        }
                        break;

                    default:
                        res.writeHead(405);
                        res.end(JSON.stringify({ success: false, message: 'Method not allowed' }));
                        break;
                }
            } catch (error) {
                console.error('API Error:', error);
                res.writeHead(500);
                res.end(JSON.stringify({ success: false, message: 'Internal server error' }));
            }
        });
        return;
    }

    // 정적 파일 서비스
    let filePath = pathname === '/' ? './index.html' : '.' + pathname;
    
    // 보안: 상위 디렉토리 접근 방지
    if (filePath.includes('..')) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    serveStaticFile(req, res, filePath);
});

server.listen(PORT, () => {
    console.log(`웨딩 서버가 http://localhost:${PORT} 에서 실행 중입니다`);
    console.log('Ctrl+C 로 서버를 종료할 수 있습니다');
});

// 깔끔한 종료 처리
process.on('SIGINT', () => {
    console.log('\n서버를 종료합니다...');
    server.close(() => {
        console.log('서버가 종료되었습니다');
        process.exit(0);
    });
});