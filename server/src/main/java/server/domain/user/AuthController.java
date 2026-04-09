package server.domain.user;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import server.security.JwtUtil;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;
    private final InviteCodeRepository inviteCodeRepository;

    // 로그인 API
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> req) {
        String loginId = req.get("loginId");
        String password = req.get("password");

        // 사용자 조회
        User user = userRepository.findByLoginId(loginId)
                .orElse(null);

        if (user == null || !passwordEncoder.matches(password, user.getPassword())) {
            return ResponseEntity.status(401)
                    .body(Map.of("message", "아이디 또는 비밀번호가 올바르지 않습니다."));
        }

        if (!user.getActive()) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "비활성화된 계정입니다."));
        }

        // JWT 토큰 발급
        String token = jwtUtil.generateToken(user.getLoginId(), user.getRole().name());

        return ResponseEntity.ok(Map.of(
                "token", token,
                "name", user.getName(),
                "loginId", user.getLoginId(),
                "role", user.getRole().name(),
                "companyId", user.getCompanyId() != null ? user.getCompanyId() : ""
        ));
    }

    // 회원가입 API
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> req) {
        String loginId = req.get("loginId");
        String password = req.get("password");
        String name     = req.get("name");
        String email    = req.get("email");

        if (userRepository.existsByLoginId(loginId)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "이미 사용중인 아이디입니다."));
        }

        User user = User.builder()
                .loginId(loginId)
                .password(passwordEncoder.encode(password))
                .name(name)
                .email(email)
                .role(Role.REVIEWER)
                .build();

        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "회원가입이 완료되었습니다."));
    }
    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody Map<String, String> req) {
        String loginId = req.get("loginId");
        String password = req.get("password");
        String name = req.get("name") != null ? req.get("name") : loginId;
        String inviteCode = req.get("inviteCode");

        if (userRepository.existsByLoginId(loginId)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "이미 사용중인 아이디입니다."));
        }

        // 초대코드 검증
        String companyId = "";
        String createdBy = "";
        if (inviteCode != null && !inviteCode.isEmpty()) {
            InviteCode ic = inviteCodeRepository.findByCode(inviteCode).orElse(null);
            if (ic == null) return ResponseEntity.badRequest().body(Map.of("message", "유효하지 않은 초대 코드입니다."));
            if (ic.getUsed()) return ResponseEntity.badRequest().body(Map.of("message", "이미 사용된 초대 코드입니다."));
            if (ic.getExpiresAt().isBefore(java.time.LocalDateTime.now())) return ResponseEntity.badRequest().body(Map.of("message", "만료된 초대 코드입니다."));
            companyId = ic.getCompanyId();
            createdBy = ic.getCreatedBy();
            // 코드 사용 처리
            ic.setUsed(true);
            ic.setUsedBy(loginId);
            inviteCodeRepository.save(ic);
        }

        User user = User.builder()
                .loginId(loginId)
                .password(passwordEncoder.encode(password))
                .name(name)
                .role(Role.REVIEWER)
                .active(true)
                .companyId(companyId)
                .createdBy(createdBy)
                .build();

        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "가입완료"));
    }

}