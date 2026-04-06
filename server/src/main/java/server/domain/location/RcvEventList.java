package server.domain.location;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "rcv_event_list")
@Getter @Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RcvEventList {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idx;

    // 장비 IMEI
    @Column(name = "imei", length = 20)
    private String imei;

    // 전송할 텍스트 명령
    @Column(name = "text", columnDefinition = "TEXT")
    private String text;

    // 상태: 0=대기, 1=성공, 2=실패
    @Column(name = "status", length = 5)
    private String status = "0";

    // 등록 시간
    @Column(name = "reg_date", length = 20)
    private String regDate;
}