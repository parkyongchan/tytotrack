package server.domain.user;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.RequestHeader;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final server.security.JwtUtil jwtUtil;
    private final InviteCodeRepository inviteCodeRepository;

    // 전체 사용자 조회
    @GetMapping
    public ResponseEntity<?> getUsers(
            @RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        String loginId = jwtUtil.getLoginId(token);
        String role = jwtUtil.getRole(token);

        List<User> allUsers = userRepository.findAll();
        List<User> users;

        User currentUser = userRepository.findByLoginId(loginId).orElse(null);
        String companyId = currentUser != null ? currentUser.getCompanyId() : null;

        if (role.equals("SUPER_ADMIN")) {
            users = allUsers;
        } else if (role.equals("ADMIN")) {
            // 같은 companyId 의 모든 사용자
            users = allUsers.stream()
                    .filter(u -> companyId != null && companyId.equals(u.getCompanyId()))
                    .toList();
        } else {
            // Reviewer는 본인만
            users = allUsers.stream()
                    .filter(u -> u.getLoginId().equals(loginId))
                    .toList();
        }

        return ResponseEntity.ok(users.stream().map(u -> {
            java.util.Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", u.getId());
            map.put("loginId", u.getLoginId());
            map.put("name", u.getName());
            map.put("role", u.getRole().name());
            map.put("email", u.getEmail() != null ? u.getEmail() : "");
            map.put("country", u.getCountry() != null ? u.getCountry() : "");
            map.put("active", u.getActive());
            map.put("companyId", u.getCompanyId() != null ? u.getCompanyId() : "");
            map.put("gmtZone", u.getGmtZone() != null ? u.getGmtZone() : 9);
            map.put("locationFormat", u.getLocationFormat() != null ? u.getLocationFormat() : "DD");
            map.put("speedUnit", u.getSpeedUnit() != null ? u.getSpeedUnit() : "KN");
            map.put("textViewRefresh", u.getTextViewRefresh() != null ? u.getTextViewRefresh() : true);
            map.put("textViewRefreshMin", u.getTextViewRefreshMin() != null ? u.getTextViewRefreshMin() : 1);
            map.put("phone", u.getPhone() != null ? u.getPhone() : "");
            map.put("assignedDeviceImeis", u.getAssignedDeviceImeis() != null ? u.getAssignedDeviceImeis() : new java.util.ArrayList<>());
            return map;
        }).toList());
    }
    // 아이디 중복 체크
    @GetMapping("/check")
    public ResponseEntity<?> checkLoginId(@RequestParam String loginId) {
        boolean exists = userRepository.existsByLoginId(loginId);
        return ResponseEntity.ok(Map.of("exists", exists));
    }


    // 사용자 등록
    @PostMapping
    public ResponseEntity<?> createUser(
            @RequestBody Map<String, Object> req,
            @RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        String creatorId = jwtUtil.getLoginId(token);
        if (userRepository.existsByLoginId(String.valueOf(req.get("loginId")))) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "이미 사용중인 아이디입니다."));
        }

        User user = User.builder()
                .loginId(String.valueOf(req.get("loginId")))
                .password(passwordEncoder.encode(String.valueOf(req.get("password"))))
                .name(String.valueOf(req.get("name")))
                .email(req.get("email") != null ? String.valueOf(req.get("email")) : null)
                .country(req.get("country") != null ? String.valueOf(req.get("country")) : null)
                .role(Role.valueOf(req.getOrDefault("role", "REVIEWER").toString()))
                .createdBy(creatorId)
                .companyId(req.get("companyId") != null ? String.valueOf(req.get("companyId")) : "")
                .build();
        // assignedDeviceImeis 처리
        if (req.get("assignedDeviceImeis") instanceof java.util.List<?> list) {
            user.setAssignedDeviceImeis(
                    list.stream()
                            .map(Object::toString)
                            .collect(java.util.stream.Collectors.toList())
            );
        }
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "사용자 등록 완료"));
    }

    // 사용자 수정
    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(
            @PathVariable Long id,
            @RequestBody Map<String, Object> req) {

        return userRepository.findById(id)
                .map(user -> {
                    if (req.get("name") != null) user.setName(String.valueOf(req.get("name")));
                    if (req.get("email") != null) {
                        String email = String.valueOf(req.get("email"));
                        user.setEmail(email.isEmpty() ? null : email);
                    }
                    if (req.get("country") != null) user.setCountry(String.valueOf(req.get("country")));
                    if (req.get("role") != null) user.setRole(Role.valueOf(String.valueOf(req.get("role"))));
                    if (req.get("password") != null && !String.valueOf(req.get("password")).isEmpty()) {
                        user.setPassword(passwordEncoder.encode(String.valueOf(req.get("password"))));
                    }
                    if (req.get("active") != null) {
                        user.setActive(Boolean.parseBoolean(String.valueOf(req.get("active"))));
                    }
                    if (req.get("gmtZone") != null) user.setGmtZone(((Number) req.get("gmtZone")).intValue());
                    if (req.get("locationFormat") != null) user.setLocationFormat(String.valueOf(req.get("locationFormat")));
                    if (req.get("speedUnit") != null) user.setSpeedUnit(String.valueOf(req.get("speedUnit")));
                    if (req.get("textViewRefresh") != null) user.setTextViewRefresh((Boolean) req.get("textViewRefresh"));
                    if (req.get("textViewRefreshMin") != null) user.setTextViewRefreshMin(((Number) req.get("textViewRefreshMin")).intValue());
                    if (req.get("phone") != null) user.setPhone(String.valueOf(req.get("phone")));
                    if (req.get("companyId") != null) user.setCompanyId(String.valueOf(req.get("companyId")));
                    if (req.get("assignedDeviceImeis") != null) {
                        Object imeiObj = req.get("assignedDeviceImeis");
                        if (imeiObj instanceof java.util.List<?> list) {
                            user.setAssignedDeviceImeis(
                                    list.stream()
                                            .map(Object::toString)
                                            .collect(java.util.stream.Collectors.toList())
                            );
                        }
                    }
                    userRepository.save(user);
                    return ResponseEntity.ok(Map.of("message", "수정 완료"));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // 사용자 삭제 (비활성화)
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(user -> {
                    userRepository.delete(user);
                    return ResponseEntity.ok(Map.of("message", "삭제 완료"));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/toggle")
    public ResponseEntity<?> toggleUser(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(user -> {
                    user.setActive(!user.getActive());
                    userRepository.save(user);
                    return ResponseEntity.ok(Map.of("message", user.getActive() ? "활성화 완료" : "중지 완료", "active", user.getActive()));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // 초대 코드 생성 (Admin 이상)
    @PostMapping("/invite")
    public ResponseEntity<?> createInviteCode(
            @RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        String loginId = jwtUtil.getLoginId(token);

        User currentUser = userRepository.findByLoginId(loginId).orElse(null);
        if (currentUser == null) return ResponseEntity.badRequest().body(Map.of("message", "사용자 없음"));

        String companyId = currentUser.getCompanyId();
        if (companyId == null || companyId.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Company ID가 설정되지 않았습니다."));
        }

        // 코드 생성
        String code = "TYTO-" + loginId.toUpperCase().substring(0, Math.min(4, loginId.length()))
                + "-" + String.format("%04d", (int)(Math.random() * 10000));

        InviteCode inviteCode = InviteCode.builder()
                .code(code)
                .companyId(companyId)
                .createdBy(loginId)
                .used(false)
                .expiresAt(java.time.LocalDateTime.now().plusDays(7))
                .createdAt(java.time.LocalDateTime.now())
                .build();

        inviteCodeRepository.save(inviteCode);
        return ResponseEntity.ok(Map.of(
                "code", code,
                "expiresAt", inviteCode.getExpiresAt().toString(),
                "companyId", companyId
        ));
    }

    // 초대 코드 검증
    @GetMapping("/invite/verify")
    public ResponseEntity<?> verifyInviteCode(@RequestParam String code) {
        return inviteCodeRepository.findByCode(code)
                .map(ic -> {
                    if (ic.getUsed()) return ResponseEntity.badRequest().body(Map.of("message", "이미 사용된 코드입니다.", "valid", false));
                    if (ic.getExpiresAt().isBefore(java.time.LocalDateTime.now())) return ResponseEntity.badRequest().body(Map.of("message", "만료된 코드입니다.", "valid", false));
                    return ResponseEntity.ok(Map.of("valid", true, "companyId", ic.getCompanyId(), "createdBy", ic.getCreatedBy()));
                })
                .orElse(ResponseEntity.badRequest().body(Map.of("message", "유효하지 않은 코드입니다.", "valid", false)));
    }
}