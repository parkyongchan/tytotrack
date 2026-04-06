package server.domain.device;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import server.domain.user.User;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "devices")
@Getter @Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class Device {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 15)
    private String imei;

    @Column(nullable = false, length = 100)
    private String alias;

    @Column(length = 20)
    private String model;        // TYTO2, TYTO5, TYTO6, TYTO100

    @Column(length = 10)
    private String type;         // SBD, TMIT

    @Column(length = 20)
    private String satellite;    // IRIDIUM, GLOBALSTAR

    private String profileName;
    private LocalDate openDate;

    @Builder.Default
    private Boolean active = true;

    private LocalDateTime deletedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_user_id")
    private User assignedUser;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;
}