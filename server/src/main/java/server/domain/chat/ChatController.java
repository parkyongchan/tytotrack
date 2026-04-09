package server.domain.chat;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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
    private final JwtUtil jwtUtil;

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

    // ── 웹→위성 메시지 조회 (rcv_event_list) ──
    @GetMapping("/rcv")
    public ResponseEntity<?> getRcvMessages(
            @RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        String role = jwtUtil.getRole(token);

        List<RcvEventList> messages = rcvRepository.findAllByOrderByRegDateAsc();
        return ResponseEntity.ok(messages);
    }

    // ── 웹→위성 메시지 전송 (rcv_event_list에 저장) ──
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

        RcvEventList rcv = RcvEventList.builder()
                .imei(imei)
                .text(text)
                .status("0") // 0: 대기
                .regDate(now)
                .build();
        rcvRepository.save(rcv);

        return ResponseEntity.ok(Map.of("message", "전송 대기 등록 완료", "idx", rcv.getIdx()));
    }

    // ── 재전송 ──
    @PutMapping("/rcv/{idx}/retry")
    public ResponseEntity<?> retryRcv(@PathVariable Long idx) {
        return rcvRepository.findById(idx)
                .map(rcv -> {
                    rcv.setStatus("0");
                    rcv.setMtStatus(null);
                    rcv.setRetryCount(rcv.getRetryCount() == null ? 1 : rcv.getRetryCount() + 1);
                    rcvRepository.save(rcv);
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
        rcvRepository.deleteById(idx);
        return ResponseEntity.ok(Map.of("message", "삭제 완료"));
    }
}