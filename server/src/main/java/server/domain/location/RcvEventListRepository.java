package server.domain.location;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RcvEventListRepository extends JpaRepository<RcvEventList, Long> {

    // 대기중인 명령 조회 (status=0)
    List<RcvEventList> findByStatusOrderByIdxAsc(String status);

    // IMEI별 명령 조회
    List<RcvEventList> findByImeiOrderByIdxDesc(String imei);
}