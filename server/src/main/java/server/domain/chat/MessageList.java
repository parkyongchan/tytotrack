package server.domain.chat;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "message_list")
@Getter @Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageList {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "mid")
    private Long mid;

    // 장비 IMEI (SWITCH: m_esn)
    @Column(name = "m_esn", length = 20)
    private String mEsn;

    // 타이틀 (SWITCH: m_title)
    @Column(name = "m_title", length = 100)
    private String mTitle;

    // 메시지 내용 (SWITCH: m_memo)
    @Column(name = "m_memo", columnDefinition = "TEXT")
    private String mMemo;

    // 상태: 0=대기, 1=전송완료 (SWITCH: msgStatus)
    @Column(name = "msgstatus", length = 5)
    @Builder.Default
    private String msgStatus = "0";

    // 등록시간
    @Column(name = "reg_date", length = 20)
    private String regDate;

    // 추가 정보 (TytoTrack 전용)
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "msg_id", length = 50)
    private String msgId;

    @Column(name = "retry_count")
    @Builder.Default
    private Integer retryCount = 0;

    @Column(name = "msgbinary", columnDefinition = "TEXT")
    private String msgBinary;
}