package server.domain.location;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RcvEventListRepository extends JpaRepository<RcvEventList, Long> {

    // 대기중인 명령 조회 (status=0)
    List<RcvEventList> findByStatusOrderByIdxAsc(String status);

    // IMEI별 명령 조회
    List<RcvEventList> findByImeiOrderByIdxDesc(String imei);

    List<RcvEventList> findAllByOrderByRegDateAsc();

    List<RcvEventList> findByImeiAndEventcodeOrderByIdxDesc(String imei, String eventcode);

    // 사용자별 본인 메시지 조회
    List<RcvEventList> findByUserIdOrderByIdxDesc(Long userId);

    // msg_id로 특정 메시지 조회
    RcvEventList findByMsgId(String msgId);

    // 사용자별 + 상태별 조회
    List<RcvEventList> findByUserIdAndStatusOrderByIdxDesc(Long userId, String status);

    // IMEI + 사용자별 조회
    List<RcvEventList> findByImeiAndUserIdOrderByIdxDesc(String imei, Long userId);
}