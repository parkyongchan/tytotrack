package server.domain.device;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/devices")
@RequiredArgsConstructor
public class DeviceController {

    private final DeviceRepository deviceRepository;

    // 장비 목록 조회 (페이지네이션)
    @GetMapping
    public ResponseEntity<?> getDevices(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size) {

        Page<Device> result = deviceRepository.findByActiveTrue(
                PageRequest.of(page, size, Sort.by("createdAt").descending()));

        return ResponseEntity.ok(Map.of(
                "content", result.getContent(),
                "totalElements", result.getTotalElements(),
                "totalPages", result.getTotalPages(),
                "currentPage", result.getNumber()
        ));
    }

    // 장비 단건 조회
    @GetMapping("/{imei}")
    public ResponseEntity<?> getByImei(@PathVariable String imei) {
        return deviceRepository.findByImeiAndActiveTrue(imei)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // 장비 등록
    @PostMapping
    public ResponseEntity<?> registerDevice(@RequestBody Map<String, String> req) {
        String imei = req.get("imei");

        if (deviceRepository.existsByImei(imei)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "이미 등록된 IMEI입니다."));
        }

        Device device = Device.builder()
                .imei(imei)
                .alias(req.get("alias"))
                .model(req.get("model"))
                .type(req.get("type"))
                .satellite(req.getOrDefault("satellite", "IRIDIUM"))
                .build();

        deviceRepository.save(device);

        return ResponseEntity.ok(Map.of(
                "message", "장비 등록 완료",
                "imei", device.getImei(),
                "alias", device.getAlias()
        ));
    }

    // 장비 수정
    @PutMapping("/{imei}")
    public ResponseEntity<?> updateDevice(
            @PathVariable String imei,
            @RequestBody Map<String, String> req) {

        return deviceRepository.findByImei(imei)
                .map(device -> {
                    if (req.get("alias") != null)
                        device.setAlias(req.get("alias"));
                    if (req.get("profileName") != null)
                        device.setProfileName(req.get("profileName"));
                    deviceRepository.save(device);
                    return ResponseEntity.ok(Map.of("message", "수정 완료"));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // 장비 삭제 (소프트 삭제)
    @DeleteMapping("/{imei}")
    public ResponseEntity<?> deleteDevice(@PathVariable String imei) {
        return deviceRepository.findByImei(imei)
                .map(device -> {
                    device.setActive(false);
                    device.setDeletedAt(java.time.LocalDateTime.now());
                    deviceRepository.save(device);
                    return ResponseEntity.ok(Map.of("message", "삭제 완료"));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}