package server.domain.device;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import server.domain.user.User;
import server.domain.user.UserRepository;
import server.security.JwtUtil;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/devices")
@RequiredArgsConstructor
public class DeviceController {

    private final DeviceRepository deviceRepository;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    // 장비 목록 조회
    @GetMapping
    public ResponseEntity<?> getDevices(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size) {

        String token = authHeader.replace("Bearer ", "");
        String role = jwtUtil.getRole(token);
        String loginId = jwtUtil.getLoginId(token);

        if (role.equals("SUPER_ADMIN")) {
            // deletedAt 없는 것만 (완전삭제 제외, 중지 포함)
            List<Device> all = deviceRepository.findByDeletedAtIsNull();
            return ResponseEntity.ok(Map.of(
                    "content", all,
                    "totalElements", all.size(),
                    "totalPages", 1,
                    "currentPage", 0
            ));
        } else if (role.equals("ADMIN")) {
            User user = userRepository.findByLoginId(loginId).orElse(null);
            String companyId = user != null ? user.getCompanyId() : null;
            List<Device> devices;
            if (companyId != null && !companyId.isEmpty()) {
                // active 여부 관계없이 전체 조회 (삭제된 것만 제외)
                devices = deviceRepository.findByRegisteredByCompanyAndDeletedAtIsNull(companyId);
            } else {
                devices = deviceRepository.findByRegisteredByAndDeletedAtIsNull(loginId);
            }
            return ResponseEntity.ok(Map.of(
                    "content", devices,
                    "totalElements", devices.size(),
                    "totalPages", 1,
                    "currentPage", 0
            ));
        } else {
            User user = userRepository.findByLoginId(loginId).orElse(null);
            if (user == null) return ResponseEntity.ok(Map.of("content", List.of(), "totalElements", 0, "totalPages", 0, "currentPage", 0));

            List<String> imeis = user.getAssignedDeviceImeis() != null ? user.getAssignedDeviceImeis() : List.of();
            if (imeis.isEmpty()) return ResponseEntity.ok(Map.of("content", List.of(), "totalElements", 0, "totalPages", 0, "currentPage", 0));

            List<Device> assigned = deviceRepository.findByImeiInAndActiveTrue(imeis);
            return ResponseEntity.ok(Map.of(
                    "content", assigned,
                    "totalElements", assigned.size(),
                    "totalPages", 1,
                    "currentPage", 0
            ));
        }
    }

    // 장비 단건 조회
    @GetMapping("/{imei}")
    public ResponseEntity<?> getByImei(@PathVariable String imei) {
        return deviceRepository.findByImeiAndActiveTrue(imei)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // alias 조회용 전체 장비 (삭제 포함) — 인증된 사용자만
    @GetMapping("/all")
    public ResponseEntity<?> getAllForAlias(
            @RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        String role = jwtUtil.getRole(token);
        String loginId = jwtUtil.getLoginId(token);

        List<Device> devices;
        if (role.equals("SUPER_ADMIN")) {
            devices = deviceRepository.findAll();
        } else if (role.equals("ADMIN")) {
            User user = userRepository.findByLoginId(loginId).orElse(null);
            String companyId = user != null ? user.getCompanyId() : null;
            if (companyId != null && !companyId.isEmpty()) {
                devices = deviceRepository.findByRegisteredByCompany(companyId);
            } else {
                devices = deviceRepository.findByRegisteredBy(loginId);
            }
        } else {
            devices = List.of();
        }

        // imei + alias 만 반환
        List<Map<String, String>> result = devices.stream()
                .map(d -> Map.of(
                        "imei", d.getImei() != null ? d.getImei() : "",
                        "alias", d.getAlias() != null ? d.getAlias() : ""
                ))
                .toList();
        return ResponseEntity.ok(result);
    }

    // 장비 등록 — SUPER_ADMIN + ADMIN 가능
    @PostMapping
    public ResponseEntity<?> registerDevice(
            @RequestBody Map<String, String> req,
            @RequestHeader("Authorization") String authHeader) {

        String token = authHeader.replace("Bearer ", "");
        String loginId = jwtUtil.getLoginId(token);
        String role = jwtUtil.getRole(token);
        String imei = req.get("imei");

        // 1. 활성 장비 중복 체크
        if (deviceRepository.existsByImeiAndActiveTrue(imei)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "이미 등록된 IMEI입니다."));
        }

        // 2. companyId + assignedUser 처리
        String companyId = "";
        User assignedUser = null;
        if (role.equals("ADMIN")) {
            User admin = userRepository.findByLoginId(loginId).orElse(null);
            if (admin != null) {
                companyId = admin.getCompanyId() != null ? admin.getCompanyId() : "";
                assignedUser = admin;
            }
        } else if (role.equals("SUPER_ADMIN")) {
            String selectedId = req.get("assignedUserId");
            if (selectedId != null && !selectedId.isEmpty()) {
                try {
                    assignedUser = userRepository.findById(Long.parseLong(selectedId)).orElse(null);
                } catch (NumberFormatException ignored) {}
            }
        }

        // 3. openDate 변환
        java.time.LocalDate openDate = null;
        String openDateStr = req.get("openDate");
        if (openDateStr != null && openDateStr.length() == 8) {
            try {
                openDate = java.time.LocalDate.of(
                        Integer.parseInt(openDateStr.substring(0, 4)),
                        Integer.parseInt(openDateStr.substring(4, 6)),
                        Integer.parseInt(openDateStr.substring(6, 8))
                );
            } catch (Exception ignored) {}
        }

        // 4. 비활성 장비 있으면 재활성화 (INSERT 대신 UPDATE)
        Optional<Device> existingOpt = deviceRepository.findByImei(imei);
        if (existingOpt.isPresent()) {
            Device existing = existingOpt.get();
            existing.setAlias(req.get("alias"));
            existing.setModel(req.get("model"));
            existing.setType(req.get("type"));
            existing.setSatellite(req.getOrDefault("satellite", "IRIDIUM"));
            existing.setRegisteredBy(loginId);
            existing.setRegisteredByCompany(companyId);
            existing.setAssignedUser(assignedUser);
            existing.setOpenDate(openDate);
            existing.setActive(true);
            existing.setDeletedAt(null);
            deviceRepository.save(existing);
            return ResponseEntity.ok(Map.of("message", "장비 재등록 완료", "imei", existing.getImei(), "alias", existing.getAlias()));
        }

        // 5. 신규 등록 (active 기본값 true)
        Device device = Device.builder()
                .imei(imei)
                .alias(req.get("alias"))
                .model(req.get("model"))
                .type(req.get("type"))
                .satellite(req.getOrDefault("satellite", "IRIDIUM"))
                .registeredBy(loginId)
                .registeredByCompany(companyId)
                .assignedUser(assignedUser)
                .openDate(openDate)
                .active(true)
                .build();
        deviceRepository.save(device);
        return ResponseEntity.ok(Map.of("message", "장비 등록 완료", "imei", device.getImei(), "alias", device.getAlias()));
    }

    // 장비 수정
    @PutMapping("/{imei}")
    public ResponseEntity<?> updateDevice(
            @PathVariable String imei,
            @RequestBody Map<String, String> req) {
        return deviceRepository.findByImei(imei)
                .map(device -> {
                    if (req.get("alias") != null) device.setAlias(req.get("alias"));
                    if (req.get("profileName") != null) device.setProfileName(req.get("profileName"));
                    deviceRepository.save(device);
                    return ResponseEntity.ok(Map.of("message", "수정 완료"));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // 장비 삭제 — SUPER_ADMIN + ADMIN 가능
    @DeleteMapping("/{imei}")
    public ResponseEntity<?> deleteDevice(
            @PathVariable String imei,
            @RequestHeader("Authorization") String authHeader) {

        String token = authHeader.replace("Bearer ", "");
        String role = jwtUtil.getRole(token);
        String loginId = jwtUtil.getLoginId(token);

        return deviceRepository.findByImei(imei)
                .map(device -> {
                    if (role.equals("ADMIN")) {
                        User user = userRepository.findByLoginId(loginId).orElse(null);
                        String companyId = user != null ? user.getCompanyId() : null;
                        if (companyId == null || !companyId.equals(device.getRegisteredByCompany())) {
                            return ResponseEntity.status(403).body(Map.of("message", "삭제 권한이 없습니다."));
                        }
                    }
                    device.setActive(false);
                    device.setDeletedAt(java.time.LocalDateTime.now());
                    deviceRepository.save(device);
                    return ResponseEntity.ok(Map.of("message", "삭제 완료"));
                })
                .orElse(ResponseEntity.notFound().build());
    }
    // 장비 활성/비활성 토글 — SUPER_ADMIN + ADMIN
    @PutMapping("/{imei}/toggle")
    public ResponseEntity<?> toggleDevice(
            @PathVariable String imei,
            @RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        String role = jwtUtil.getRole(token);
        String loginId = jwtUtil.getLoginId(token);

        return deviceRepository.findByImei(imei)
                .map(device -> {
                    if (role.equals("ADMIN")) {
                        User user = userRepository.findByLoginId(loginId).orElse(null);
                        String companyId = user != null ? user.getCompanyId() : null;
                        if (companyId == null || !companyId.equals(device.getRegisteredByCompany())) {
                            return ResponseEntity.status(403).body(Map.of("message", "권한이 없습니다."));
                        }
                    }
                    boolean newActive = !Boolean.TRUE.equals(device.getActive());
                    device.setActive(newActive);
                    if (newActive) device.setDeletedAt(null);
                    deviceRepository.save(device);
                    return ResponseEntity.ok(Map.of("message", newActive ? "활성화 완료" : "비활성화 완료", "active", newActive));
                })
                .orElse(ResponseEntity.notFound().build());
    }

}