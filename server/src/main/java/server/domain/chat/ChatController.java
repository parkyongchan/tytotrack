package server.domain.chat;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatRepository chatRepository;

    // 메시지 조회 (전체 또는 lastId 이후)
    @GetMapping("/{room}")
    public ResponseEntity<?> getMessages(
            @PathVariable String room,
            @RequestParam(required = false) Long lastId) {

        List<ChatMessage> messages;
        if (lastId != null) {
            messages = chatRepository
                    .findByRoomAndIdGreaterThanOrderByIdAsc(room, lastId);
        } else {
            messages = chatRepository.findByRoomOrderByIdAsc(room);
        }
        return ResponseEntity.ok(messages);
    }

    // 메시지 전송
    @PostMapping("/{room}")
    public ResponseEntity<?> sendMessage(
            @PathVariable String room,
            @RequestBody Map<String, String> req) {

        String now = LocalDateTime.now()
                .format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));

        ChatMessage msg = ChatMessage.builder()
                .sender(req.get("sender"))
                .message(req.get("message"))
                .room(room)
                .regDate(now)
                .build();

        chatRepository.save(msg);
        return ResponseEntity.ok(Map.of(
                "id", msg.getId(),
                "message", "전송 완료"
        ));
    }
}