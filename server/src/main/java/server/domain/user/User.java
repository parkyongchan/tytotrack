package server.domain.user;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter @Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 50)
    private String loginId;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false, length = 50)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(unique = true)
    private String email;

    private String country;
    private String phone;
    private String createdBy; // 생성한 관리자 loginId
    private String companyId;
    @ElementCollection(fetch = jakarta.persistence.FetchType.EAGER)
    @CollectionTable(name = "user_assigned_devices", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "imei")
    private java.util.List<String> assignedDeviceImeis = new java.util.ArrayList<>();

    @Builder.Default
    @Column(length = 10)
    private String locationFormat = "DD";

    @Builder.Default
    @Column(length = 10)
    private String speedUnit = "KN";

    @Builder.Default
    private Integer gmtZone = 9;

    @Builder.Default
    private Boolean textViewRefresh = true;

    @Builder.Default
    private Integer textViewRefreshMin = 1;

    @Builder.Default
    private Boolean active = true;

    private LocalDateTime deletedAt;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}