package server.domain.profile;

import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name="profiles")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Profile {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    private String sosEmail;
    private String sosKakao;
    private String trackEmail;
    @Column(columnDefinition = "TEXT")
    private String channelsJson;
}