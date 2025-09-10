<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

$messagesFile = 'messages.json';

// JSON 파일에서 메시지 읽기
function getMessages() {
    global $messagesFile;
    if (file_exists($messagesFile)) {
        $content = file_get_contents($messagesFile);
        return json_decode($content, true) ?: [];
    }
    return [];
}

// JSON 파일에 메시지 저장
function saveMessages($messages) {
    global $messagesFile;
    file_put_contents($messagesFile, json_encode($messages, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // 모든 메시지 반환
        $messages = getMessages();
        echo json_encode($messages);
        break;
        
    case 'POST':
        // 새 메시지 추가
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (isset($input['name']) && isset($input['message']) && isset($input['password'])) {
            $messages = getMessages();
            
            $newMessage = [
                'id' => uniqid(),
                'name' => htmlspecialchars($input['name']),
                'message' => htmlspecialchars($input['message']),
                'password' => password_hash($input['password'], PASSWORD_DEFAULT),
                'date' => date('c')
            ];
            
            array_unshift($messages, $newMessage); // 최신 메시지가 위로
            saveMessages($messages);
            
            echo json_encode(['success' => true, 'message' => 'Message added successfully']);
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        }
        break;
        
    case 'DELETE':
        // 메시지 삭제
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (isset($input['id']) && isset($input['password'])) {
            $messages = getMessages();
            
            foreach ($messages as $index => $message) {
                if ($message['id'] === $input['id']) {
                    if (password_verify($input['password'], $message['password'])) {
                        unset($messages[$index]);
                        $messages = array_values($messages); // 인덱스 재정렬
                        saveMessages($messages);
                        echo json_encode(['success' => true, 'message' => 'Message deleted successfully']);
                    } else {
                        http_response_code(401);
                        echo json_encode(['success' => false, 'message' => 'Invalid password']);
                    }
                    exit;
                }
            }
            
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Message not found']);
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        }
        break;
        
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        break;
}
?>