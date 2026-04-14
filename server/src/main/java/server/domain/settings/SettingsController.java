package server.domain.settings;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
public class SettingsController {

    // 메모리 저장 (서버 재시작 시 초기화)
    // 영구 저장 필요 시 DB 테이블 추가
    private static final Map<String, String> store = new ConcurrentHashMap<>(Map.of(
            "Switch", "ok",
            "Satellite", "ok",
            "IMT", "ok"
    ));

    @GetMapping("/sys-status")
    public ResponseEntity<?> getSysStatus() {
        return ResponseEntity.ok(store);
    }

    @PutMapping("/sys-status")
    public ResponseEntity<?> updateSysStatus(
            @RequestBody Map<String, String> req,
            @RequestHeader("Authorization") String authHeader) {
        // SUPER_ADMIN만 변경 가능
        try {
            String token = authHeader.replace("Bearer ", "");
            String[] parts = token.split("\\.");
            String payload = new String(java.util.Base64.getUrlDecoder().decode(parts[1]));
            if (!payload.contains("SUPER_ADMIN")) {
                return ResponseEntity.status(403).body(Map.of("message", "권한 없음"));
            }
        } catch (Exception e) {
            return ResponseEntity.status(403).body(Map.of("message", "권한 확인 실패"));
        }
        req.forEach((k, v) -> {
            if (store.containsKey(k)) store.put(k, v);
        });
        return ResponseEntity.ok(store);
    }
}