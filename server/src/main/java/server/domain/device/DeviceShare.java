package server.domain.device;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "device_shares")
@Getter @Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceShare {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 15)
    private String imei;

    @Column(nullable = false, length = 50)
    private String sharedLoginId;

    @Column(nullable = false)
    private Boolean active = true;
}