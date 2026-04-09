package server.domain.user;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "invite_codes")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class InviteCode {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String code;
    private String companyId;
    private String createdBy;
    private Boolean used = false;
    private String usedBy;
    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;
}