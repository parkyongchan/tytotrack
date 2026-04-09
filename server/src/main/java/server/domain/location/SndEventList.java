package server.domain.location;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "snd_event_list")
@Getter @Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SndEventList {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idx;

    // 장비 IMEI
    @Column(name = "imei", length = 20)
    private String imei;

    // 이벤트 코드: 1=TRACK, 2=CAN, 3=MSG/CAN+GPS, 4=SOS, 5=EVENT
    // eventcode=3이고 memo 있으면 채팅메시지, position 있으면 CAN+GPS
    @Column(name = "eventcode", length = 10)
    private String eventcode;

    // VER 데이터
    @Column(name = "ver", length = 200)
    private String ver;

    // CAN 데이터
    @Column(name = "can", columnDefinition = "TEXT")
    private String can;

    // 위치 데이터 (위도,경도,방향,속도,고도,GMT시간)
    @Column(name = "position", columnDefinition = "TEXT")
    private String position;

    // 이벤트 제목
    @Column(name = "title", length = 100)
    private String title;

    // 이벤트 메모 / 메시지 전문
    @Column(name = "memo", columnDefinition = "TEXT")
    private String memo;

    // 상대방 IMEI (수신처)
    @Column(name = "rimei", length = 20)
    private String rimei;

    // ETC 데이터
    @Column(name = "etc1", length = 100)
    private String etc1;  // Istatus: 이리듐 정상여부

    @Column(name = "etc2", length = 100)
    private String etc2;  // Sstatus: 스위치 정상여부

    @Column(name = "etc3", length = 100)
    private String etc3;  // rimei: 상대방 IMEI

    @Column(name = "etc4", length = 100)
    private String etc4;  // Imtstatus: IMT 정상여부

    // 데이터 수신 시간
    @Column(name = "reg_date", length = 20)
    private String regDate;
}