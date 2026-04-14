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

    // 전송 제목
    @Column(name = "eventcode", length = 5)
    private String eventcode;

    @Column(name = "title", length = 100)
    private String title;
    // 전송할 텍스트 명령
    @Column(name = "text", columnDefinition = "TEXT")
    private String text;

    /// 상태: 0=대기, 1=GW접수성공, 2=성공, 3=실패
    @Column(name = "status", length = 5)
    @Builder.Default
    private String status = "0";

    // 메시지 고유 ID (loginId + yyyyMMddHHmmss)
    @Column(name = "msg_id", length = 30)
    private String msgId;

    // 재전송 횟수
    @Column(name = "retry_count")
    @Builder.Default
    private Integer retryCount = 0;

    // 등록 시간
    @Column(name = "reg_date", length = 20)
    private String regDate;

    // 전송한 로그인 사용자 ID
    @Column(name = "user_id")
    private Long userId;
}
