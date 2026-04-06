package server.common;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import server.domain.user.Role;
import server.domain.user.User;
import server.domain.user.UserRepository;

@Component
@RequiredArgsConstructor
public class DataInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(ApplicationArguments args) {
        // admin 계정이 없으면 자동 생성
        if (!userRepository.existsByLoginId("admin")) {
            User admin = User.builder()
                    .loginId("admin")
                    .password(passwordEncoder.encode("admin"))
                    .name("Administrator")
                    .role(Role.SUPER_ADMIN)
                    .email("admin@tytotrack.com")
                    .build();
            userRepository.save(admin);
            System.out.println("✅ Admin 계정 생성 완료");
        } else {
            // 기존 계정 비밀번호 재설정 (확실히 하기 위해)
            User admin = userRepository.findByLoginId("admin").get();
            admin.setPassword(passwordEncoder.encode("admin"));
            userRepository.save(admin);
            System.out.println("✅ Admin 비밀번호 재설정 완료");
        }
    }
}