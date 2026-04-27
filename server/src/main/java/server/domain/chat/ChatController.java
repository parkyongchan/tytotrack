package server.domain.chat;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import server.domain.location.SndEventList;
import server.domain.location.SndEventListRepository;
import server.domain.location.RcvEventList;
import server.domain.location.RcvEventListRepository;
import server.security.JwtUtil;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatRepository chatRepository;
    private final SndEventListRepository sndRepository;
    private final RcvEventListRepository rcvRepository;
    private final MessageListRepository messageListRepository;
    private final JwtUtil jwtUtil;
    private final server.domain.user.UserRepository userRepository;

    // ── 기존 일반 채팅 (하위 호환) ──
    @GetMapping("/{room}")
    public ResponseEntity<?> getMessages(
            @PathVariable String room,
            @RequestParam(required = false) Long lastId) {
        List<ChatMessage> messages;
        if (lastId != null) {
            messages = chatRepository.findByRoomAndIdGreaterThanOrderByIdAsc(room, lastId);
        } else {
            messages = chatRepository.findByRoomOrderByIdAsc(room);
        }
        return ResponseEntity.ok(messages);
    }

    @PostMapping("/{room}")
    public ResponseEntity<?> sendMessage(
            @PathVariable String room,
            @RequestBody Map<String, String> req) {
        String now = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        ChatMessage msg = ChatMessage.builder()
                .sender(req.get("sender"))
                .message(req.get("message"))
                .room(room)
                .regDate(now)
                .build();
        chatRepository.save(msg);
        return ResponseEntity.ok(Map.of("id", msg.getId(), "message", "전송 완료"));
    }

    // ── 위성→웹 메시지 조회 (snd_event_list, eventcode=3) ──
    @GetMapping("/snd")
    public ResponseEntity<?> getSndMessages(
            @RequestHeader("Authorization") String authHeader) {
        // title 또는 memo가 있는 메시지만 반환
        List<SndEventList> messages = sndRepository.findMessagesWithContent();
        return ResponseEntity.ok(messages);
    }

    // ── 웹→위성 메시지 조회 (message_list에서 조회) ──
    @GetMapping("/rcv")
    public ResponseEntity<?> getRcvMessages(
            @RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        String role = jwtUtil.getRole(token);
        String loginId = jwtUtil.getLoginId(token);

        List<MessageList> messages;
        if (role.equals("SUPER_ADMIN")) {
            messages = messageListRepository.findAllByOrderByMidAsc();
        } else {
            Long userId = userRepository.findByLoginId(loginId)
                    .map(u -> u.getId()).orElse(null);
            messages = userId != null
                    ? messageListRepository.findByUserIdOrderByMidDesc(userId)
                    : List.of();
        }
        return ResponseEntity.ok(messages);
    }

    // ── 웹→위성 메시지 전송 (message_list에 저장 → SWITCH가 읽음) ──
    @PostMapping("/rcv")
    public ResponseEntity<?> sendToSatellite(
            @RequestBody Map<String, String> req,
            @RequestHeader("Authorization") String authHeader) {

        String imei = req.get("imei");
        String text = req.get("text");
        if (imei == null || text == null || text.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "imei와 text는 필수입니다."));
        }

        String now = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));

        Long userId = null;
        String loginId = null;
        try {
            String token = authHeader.replace("Bearer ", "");
            loginId = jwtUtil.getLoginId(token);
            userId = userRepository.findByLoginId(loginId)
                    .map(u -> u.getId()).orElse(null);
        } catch (Exception ignored) {}

        String msgId = (loginId != null ? loginId : "unknown") + now;

        // SWITCH가 읽는 message_list 테이블에 저장
        MessageList msg = MessageList.builder()
                .mEsn(imei)
                .mTitle(req.get("title"))
                .mMemo(text)
                .msgStatus("0")
                .regDate(now)
                .userId(userId)
                .msgId(msgId)
                .build();
        messageListRepository.save(msg);

        return ResponseEntity.ok(Map.of("message", "전송 대기 등록 완료", "idx", msg.getMid()));
    }

    // ── 메시지 상태 조회 (폴링용) ──
    @GetMapping("/rcv/status/{mid}")
    public ResponseEntity<?> getMessageStatus(@PathVariable Long mid) {
        return messageListRepository.findById(mid)
                .map(msg -> ResponseEntity.ok(Map.of(
                        "mid", msg.getMid(),
                        "status", msg.getMsgStatus() != null ? msg.getMsgStatus() : "0"
                )))
                .orElse(ResponseEntity.notFound().build());
    }

    // ── 재전송 ──
    @PutMapping("/rcv/{idx}/retry")
    public ResponseEntity<?> retryRcv(@PathVariable Long idx) {
        return messageListRepository.findById(idx)
                .map(msg -> {
                    msg.setMsgStatus("0");
                    messageListRepository.save(msg);
                    return ResponseEntity.ok(Map.of("message", "재전송 등록 완료"));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // ── 메시지 삭제 (SUPER_ADMIN만) ──
    @DeleteMapping("/snd/{idx}")
    public ResponseEntity<?> deleteSnd(
            @PathVariable Long idx,
            @RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        String role = jwtUtil.getRole(token);
        if (!role.equals("SUPER_ADMIN")) {
            return ResponseEntity.status(403).body(Map.of("message", "권한 없음"));
        }
        sndRepository.deleteById(idx);
        return ResponseEntity.ok(Map.of("message", "삭제 완료"));
    }

    @DeleteMapping("/rcv/{idx}")
    public ResponseEntity<?> deleteRcv(
            @PathVariable Long idx,
            @RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        String role = jwtUtil.getRole(token);
        if (!role.equals("SUPER_ADMIN")) {
            return ResponseEntity.status(403).body(Map.of("message", "권한 없음"));
        }
        messageListRepository.deleteById(idx);
        return ResponseEntity.ok(Map.of("message", "삭제 완료"));
    }

    // ══════════════════════════════════════════════════════════════
    // 채팅방 일괄 삭제 — 특정 IMEI의 모든 메시지(snd + rcv) 삭제
    // SUPER_ADMIN 권한 필요
    // ══════════════════════════════════════════════════════════════
    @DeleteMapping("/room/{imei}")
    @Transactional
    public ResponseEntity<?> deleteRoom(
            @PathVariable String imei,
            @RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        String role = jwtUtil.getRole(token);
        if (!role.equals("SUPER_ADMIN")) {
            return ResponseEntity.status(403).body(Map.of("message", "권한 없음"));
        }

        try {
            // 1. snd_event_list에서 해당 IMEI의 채팅 메시지 (eventcode=3,5) 삭제
            int sndDeleted = sndRepository.deleteChatByImei(imei);
            
            // 2. message_list에서 해당 IMEI(m_esn) 메시지 삭제
            int msgDeleted = messageListRepository.deleteByMEsn(imei);

            return ResponseEntity.ok(Map.of(
                "message", "채팅방 삭제 완료",
                "imei", imei,
                "sndDeleted", sndDeleted,
                "msgDeleted", msgDeleted,
                "total", sndDeleted + msgDeleted
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of(
                "message", "삭제 실패: " + e.getMessage()
            ));
        }
    }

    // ── 여러 채팅방 일괄 삭제 ──
    @DeleteMapping("/rooms")
    @Transactional
    public ResponseEntity<?> deleteRooms(
            @RequestBody Map<String, List<String>> req,
            @RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        String role = jwtUtil.getRole(token);
        if (!role.equals("SUPER_ADMIN")) {
            return ResponseEntity.status(403).body(Map.of("message", "권한 없음"));
        }

        List<String> imeis = req.get("imeis");
        if (imeis == null || imeis.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "imeis는 필수입니다."));
        }

        int totalSnd = 0, totalMsg = 0;
        try {
            for (String imei : imeis) {
                totalSnd += sndRepository.deleteChatByImei(imei);
                totalMsg += messageListRepository.deleteByMEsn(imei);
            }
            return ResponseEntity.ok(Map.of(
                "message", "채팅방 일괄 삭제 완료",
                "rooms", imeis.size(),
                "sndDeleted", totalSnd,
                "msgDeleted", totalMsg,
                "total", totalSnd + totalMsg
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of(
                "message", "삭제 실패: " + e.getMessage()
            ));
        }
    }
}
