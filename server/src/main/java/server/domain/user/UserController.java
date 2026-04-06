package server.domain.user;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    // 전체 사용자 조회
    @GetMapping
    public ResponseEntity<?> getUsers() {
        List<User> users = userRepository.findAll();
        return ResponseEntity.ok(users.stream().map(u -> Map.of(
                "id", u.getId(),
                "loginId", u.getLoginId(),
                "name", u.getName(),
                "role", u.getRole().name(),
                "email", u.getEmail() != null ? u.getEmail() : "",
                "country", u.getCountry() != null ? u.getCountry() : "",
                "active", u.getActive()
        )).toList());
    }
    // 아이디 중복 체크
    @GetMapping("/check")
    public ResponseEntity<?> checkLoginId(@RequestParam String loginId) {
        boolean exists = userRepository.existsByLoginId(loginId);
        return ResponseEntity.ok(Map.of("exists", exists));
    }


    // 사용자 등록
    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody Map<String, String> req) {
        if (userRepository.existsByLoginId(req.get("loginId"))) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "이미 사용중인 아이디입니다."));
        }

        User user = User.builder()
                .loginId(req.get("loginId"))
                .password(passwordEncoder.encode(req.get("password")))
                .name(req.get("name"))
                .email(req.get("email"))
                .country(req.get("country"))
                .role(Role.valueOf(req.getOrDefault("role", "REVIEWER")))
                .build();

        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "사용자 등록 완료"));
    }

    // 사용자 수정
    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(
            @PathVariable Long id,
            @RequestBody Map<String, String> req) {

        return userRepository.findById(id)
                .map(user -> {
                    if (req.get("name") != null) user.setName(req.get("name"));
                    if (req.get("email") != null) user.setEmail(req.get("email"));
                    if (req.get("country") != null) user.setCountry(req.get("country"));
                    if (req.get("role") != null) user.setRole(Role.valueOf(req.get("role")));
                    if (req.get("password") != null && !req.get("password").isEmpty()) {
                        user.setPassword(passwordEncoder.encode(req.get("password")));
                    }
                    if (req.get("active") != null) {
                        user.setActive(Boolean.parseBoolean(req.get("active")));
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
                    user.setActive(false);
                    userRepository.save(user);
                    return ResponseEntity.ok(Map.of("message", "비활성화 완료"));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}