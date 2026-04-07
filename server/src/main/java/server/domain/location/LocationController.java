package server.domain.location;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/location")
@RequiredArgsConstructor
public class LocationController {

    private final SndEventListRepository sndRepo;
    private final RcvEventListRepository rcvRepo;

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

    // 장비 명령 전송 (DB → SWITCH)
    @PostMapping("/command")
    public ResponseEntity<?> sendCommand(@RequestBody Map<String, String> req) {
        String now = LocalDateTime.now()
                .format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));

        RcvEventList cmd = RcvEventList.builder()
                .imei(req.get("imei"))
                .text(req.get("text"))
                .status("0")
                .regDate(now)
                .build();

        rcvRepo.save(cmd);
        return ResponseEntity.ok(Map.of("message", "명령 등록 완료", "idx", cmd.getIdx()));
    }

    // 대기중인 명령 조회
    @GetMapping("/command/pending")
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
}