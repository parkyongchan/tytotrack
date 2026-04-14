package server.domain.location;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import server.domain.user.UserRepository;
import server.security.JwtUtil;

@RestController
@RequestMapping("/api/location")
@RequiredArgsConstructor
public class LocationController {

    private final SndEventListRepository sndRepo;
    private final RcvEventListRepository rcvRepo;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    // 전체 장비 최신 위치 조회
    @GetMapping("/latest")
    public ResponseEntity<?> getLatestPositions() {
        List<SndEventList> list = sndRepo.findLatestPositionPerDevice();
        return ResponseEntity.ok(list);
    }

    // IMEI별 위치 이력 조회
    @GetMapping("/{imei}")
    public ResponseEntity<?> getPositionByImei(@PathVariable String imei) {
        List<SndEventList> list = sndRepo.findByImeiOrderByIdxDesc(imei);
        return ResponseEntity.ok(list);
    }

    // 위성 데이터 수신 (SWITCH → DB)
    @PostMapping("/receive")
    public ResponseEntity<?> receiveData(@RequestBody SndEventList data) {
        String now = LocalDateTime.now()
                .format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        data.setRegDate(now);
        sndRepo.save(data);
        return ResponseEntity.ok(Map.of("message", "수신 완료", "idx", data.getIdx()));
    }

    /// SUPER_ADMIN 전용 삭제
    @DeleteMapping("/snd/{idx}")
    public ResponseEntity<?> deleteSnd(
            @PathVariable Long idx,
            @RequestHeader("Authorization") String authHeader) {
        // JWT에서 role 직접 파싱 (간단 처리)
        try {
            String token = authHeader.replace("Bearer ", "");
            String[] parts = token.split("\\.");
            if (parts.length < 2) return ResponseEntity.status(403).body(Map.of("message", "권한 없음"));
            String payload = new String(java.util.Base64.getUrlDecoder().decode(parts[1]));
            if (!payload.contains("SUPER_ADMIN")) {
                return ResponseEntity.status(403).body(Map.of("message", "권한 없음"));
            }
            sndRepo.deleteById(idx);
            return ResponseEntity.ok(Map.of("message", "삭제 완료"));
        } catch (Exception e) {
            return ResponseEntity.status(403).body(Map.of("message", "권한 확인 실패"));
        }
    }

    /// 장비 명령 전송 (DB → SWITCH)
    @PostMapping("/command")
    public ResponseEntity<?> sendCommand(
            @RequestBody Map<String, String> req,
            @RequestHeader("Authorization") String authHeader) {
        String now = LocalDateTime.now()
                .format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));

        // JWT에서 userId 추출
        Long userId = null;
        String loginId = null;
        try {
            String token = authHeader.replace("Bearer ", "");
            loginId = jwtUtil.getLoginId(token);
            userId = userRepository.findByLoginId(loginId)
                    .map(u -> u.getId()).orElse(null);
        } catch (Exception ignored) {}

        String msgId = (loginId != null ? loginId : "unknown") + now;

        RcvEventList cmd = RcvEventList.builder()
                .imei(req.get("imei"))
                .text(req.get("text"))
                .eventcode(req.get("eventcode"))
                .status("0")
                .regDate(now)
                .userId(userId)
                .msgId(msgId)
                .build();

        rcvRepo.save(cmd);
        return ResponseEntity.ok(Map.of("message", "명령 등록 완료", "idx", cmd.getIdx()));
    }

    // GEO Fence 목록 조회
    @GetMapping("/command/geo/{imei}")
    public ResponseEntity<?> getGeoCommands(@PathVariable String imei) {
        List<RcvEventList> list = rcvRepo.findByImeiAndEventcodeOrderByIdxDesc(imei, "3");
        return ResponseEntity.ok(list);
    }

    // GEO Fence 슬롯 저장
    @PostMapping("/command/geo")
    public ResponseEntity<?> saveGeoSlot(
            @RequestBody Map<String, Object> req,
            @RequestHeader("Authorization") String authHeader) {
        String now = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        Long userId = null;
        try {
            String token = authHeader.replace("Bearer ", "");
            String loginId = jwtUtil.getLoginId(token);
            userId = userRepository.findByLoginId(loginId)
                    .map(u -> u.getId()).orElse(null);
        } catch (Exception ignored) {}

        RcvEventList geo = RcvEventList.builder()
                .imei((String) req.get("imei"))
                .eventcode("3")
                .title((String) req.get("slotName"))
                .text((String) req.get("command"))
                .status("0")
                .regDate(now)
                .userId(userId)
                .build();
        rcvRepo.save(geo);
        return ResponseEntity.ok(Map.of("message", "저장 완료", "idx", geo.getIdx()));
    }



    // 명령 상태 단건 조회
    @GetMapping("/command/status/{idx}")
    public ResponseEntity<?> getCommandStatus(@PathVariable Long idx) {
        return rcvRepo.findById(idx)
                .map(cmd -> ResponseEntity.ok(Map.of(
                        "idx", cmd.getIdx(),
                        "status", cmd.getStatus() != null ? cmd.getStatus() : "0",
                        "msgId", cmd.getMsgId() != null ? cmd.getMsgId() : ""
                )))
                .orElse(ResponseEntity.notFound().build());
    }
    public ResponseEntity<?> getPendingCommands() {
        List<RcvEventList> list = rcvRepo.findByStatusOrderByIdxAsc("0");
        return ResponseEntity.ok(list);
    }

    // 명령 상태 업데이트 (ACK 수신 시)
    @PutMapping("/command/{idx}")
    public ResponseEntity<?> updateCommandStatus(
            @PathVariable Long idx,
            @RequestBody Map<String, String> req) {

        return rcvRepo.findById(idx)
                .map(cmd -> {
                    cmd.setStatus(req.get("status")); // 1=성공, 2=실패
                    rcvRepo.save(cmd);
                    return ResponseEntity.ok(Map.of("message", "상태 업데이트 완료"));
                })
                .orElse(ResponseEntity.notFound().build());
    }
    @GetMapping("/range")
    public ResponseEntity<?> getLocationRange(
            @RequestParam String start,
            @RequestParam String end) {
        List<SndEventList> data = sndRepo
                .findByRegDateBetweenOrderByRegDateDesc(start, end);
        return ResponseEntity.ok(data);
    }

    // TLE 데이터 proxy
    @GetMapping("/tle/iridium")
    public ResponseEntity<?> getIridiumTLE() {
        try {
            java.net.URL url = new java.net.URL("https://celestrak.org/NORAD/elements/gp.php?GROUP=iridium-NEXT&FORMAT=tle");
            java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
            conn.setRequestProperty("User-Agent", "Mozilla/5.0");
            String text = new String(conn.getInputStream().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
            if (text != null && text.contains("1 ")) return ResponseEntity.ok()
                    .contentType(org.springframework.http.MediaType.TEXT_PLAIN)
                    .body(text);
            // Celestrak 실제 TLE
            url = new java.net.URL("https://celestrak.org/supplemental/tle-new/iridium-NEXT.txt");
            conn = (java.net.HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
            conn.setRequestProperty("User-Agent", "Mozilla/5.0");
            text = new String(conn.getInputStream().readAllBytes());
            return ResponseEntity.ok(text);
        } catch (Exception e) {
            try {
                java.net.URL url2 = new java.net.URL("https://celestrak.org/supplemental/tle-new/iridium-NEXT.txt");
                java.net.HttpURLConnection conn2 = (java.net.HttpURLConnection) url2.openConnection();
                conn2.setConnectTimeout(5000);
                conn2.setReadTimeout(5000);
                conn2.setRequestProperty("User-Agent", "Mozilla/5.0");
                String text2 = new String(conn2.getInputStream().readAllBytes());
                return ResponseEntity.ok(text2);
            } catch (Exception e2) {
                System.out.println("TLE 1차 오류: " + e.getMessage());
                System.out.println("TLE 2차 오류: " + e2.getMessage());
                return ResponseEntity.ok(getSampleIridiumTLE());
            }
        }
    }

    @GetMapping("/tle/starlink")
    public ResponseEntity<?> getStarlinkTLE() {
        // 캐시 유효 (2시간)
        long now = System.currentTimeMillis();
        if (starlinkTLECache != null && (now - starlinkCacheTime) < 2 * 60 * 60 * 1000) {
            System.out.println("Starlink TLE 캐시 반환 (" + starlinkTLECache.split("\n").length + " lines)");
            return ResponseEntity.ok()
                    .contentType(org.springframework.http.MediaType.TEXT_PLAIN)
                    .body(starlinkTLECache);
        }

        String[] urls = {
                "https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle",
                "https://celestrak.org/NORAD/elements/supplemental/sup-gp.php?FILE=starlink&FORMAT=tle"
        };
        for (String urlStr : urls) {
            try {
                java.net.URL url = new java.net.URL(urlStr);
                java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(30000);
                conn.setRequestProperty("User-Agent", "Mozilla/5.0");
                conn.setRequestProperty("Accept", "text/plain");
                String text = new String(conn.getInputStream().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
                if (text != null && text.contains("1 ")) {
                    starlinkTLECache = text;
                    starlinkCacheTime = now;
                    System.out.println("Starlink TLE 성공+캐시저장: " + text.split("\n").length + " lines");
                    return ResponseEntity.ok()
                            .contentType(org.springframework.http.MediaType.TEXT_PLAIN)
                            .body(text);
                }
            } catch (Exception e) {
                System.out.println("Starlink TLE 실패: " + urlStr + " - " + e.getMessage());
            }
        }
        // 캐시가 있으면 만료됐어도 반환
        if (starlinkTLECache != null) {
            System.out.println("Starlink TLE 만료 캐시 반환");
            return ResponseEntity.ok()
                    .contentType(org.springframework.http.MediaType.TEXT_PLAIN)
                    .body(starlinkTLECache);
        }
        return ResponseEntity.ok()
                .contentType(org.springframework.http.MediaType.TEXT_PLAIN)
                .body(getSampleStarlinkTLE());
    }

    private String getSampleIridiumTLE() {
        return "IRIDIUM 4\n1 24796U 97020D   24001.50000000  .00000000  00000-0  00000-0 0  9999\n2 24796  86.4000  10.0000 0002000  90.0000 270.0000 14.34000000000000\n" +
                "IRIDIUM 5\n1 24836U 97020H   24001.50000000  .00000000  00000-0  00000-0 0  9999\n2 24836  86.4000  25.0000 0002000  90.0000 270.0000 14.34000000000000\n" +
                "IRIDIUM 6\n1 24903U 97020K   24001.50000000  .00000000  00000-0  00000-0 0  9999\n2 24903  86.4000  40.0000 0002000  90.0000 270.0000 14.34000000000000\n";
    }

    // Starlink TLE 메모리 캐시
    private static String starlinkTLECache = null;
    private static long starlinkCacheTime = 0;

    private String getSampleStarlinkTLE() {
        return "STARLINK-1\n1 44713U 19074A   24001.50000000  .00000000  00000-0  00000-0 0  9999\n2 44713  53.0000  10.0000 0001000  90.0000 270.0000 15.05000000000000\n" +
                "STARLINK-2\n1 44714U 19074B   24001.50000000  .00000000  00000-0  00000-0 0  9999\n2 44714  53.0000  25.0000 0001000  90.0000 270.0000 15.05000000000000\n" +
                "STARLINK-3\n1 44715U 19074C   24001.50000000  .00000000  00000-0  00000-0 0  9999\n2 44715  53.0000  40.0000 0001000  90.0000 270.0000 15.05000000000000\n";
    }
}