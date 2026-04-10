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

    // 상태: 0=대기, 1=성공, 2=실패
    @Column(name = "status", length = 5)
    private String status = "0";

    // 이리듐 GW MT Confirmation 상태코드
    @Column(name = "mt_status", length = 10)
    private String mtStatus;

    // 이리듐 GW Auto ID Reference
    @Column(name = "auto_id", length = 20)
    private String autoId;

    // 재전송 횟수
    @Column(name = "retry_count")
    @Builder.Default
    private Integer retryCount = 0;

    // 등록 시간
    @Column(name = "reg_date", length = 20)
    private String regDate;
}