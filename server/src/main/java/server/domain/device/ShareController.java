package server.domain.device;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import server.domain.user.UserRepository;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/share")
@RequiredArgsConstructor
public class ShareController {

    private final DeviceShareRepository shareRepository;
    private final DeviceRepository deviceRepository;
    private final UserRepository userRepository;

    // 장비별 공유 목록 조회
    @GetMapping("/{imei}")
    public ResponseEntity<?> getShares(@PathVariable String imei) {
        List<DeviceShare> shares = shareRepository.findByImei(imei);
        return ResponseEntity.ok(shares);
    }

    // 공유 추가
    @PostMapping
    public ResponseEntity<?> addShare(@RequestBody Map<String, String> req) {
        String imei = req.get("imei");
        String loginId = req.get("loginId");

        if (!deviceRepository.existsByImei(imei)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "존재하지 않는 장비입니다."));
        }

        if (!userRepository.existsByLoginId(loginId)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "존재하지 않는 사용자입니다."));
        }

        if (shareRepository.existsByImeiAndSharedLoginId(imei, loginId)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "이미 공유된 사용자입니다."));
        }

        DeviceShare share = DeviceShare.builder()
                .imei(imei)
                .sharedLoginId(loginId)
                .active(true)
                .build();

        shareRepository.save(share);
        return ResponseEntity.ok(Map.of("message", "공유 완료"));
    }

    // 공유 삭제
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteShare(@PathVariable Long id) {
        shareRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "공유 삭제 완료"));
    }

    // 사용자별 공유 장비 목록
    @GetMapping("/my/{loginId}")
    public ResponseEntity<?> getMyShares(@PathVariable String loginId) {
        List<DeviceShare> shares = shareRepository.findBySharedLoginId(loginId);
        return ResponseEntity.ok(shares);
    }
}