package server.domain.location;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface SndEventListRepository extends JpaRepository<SndEventList, Long> {

    // IMEI별 위치 데이터 조회 (TRACK/SOS)
    List<SndEventList> findByImeiOrderByIdxDesc(String imei);

    // 전체 최신 위치 데이터 (각 장비별 최신 1건)
    @Query(value = """
        SELECT DISTINCT ON (imei) *
        FROM snd_event_list
        WHERE position IS NOT NULL AND position != ''
        ORDER BY imei, idx DESC
        """, nativeQuery = true)
    List<SndEventList> findLatestPositionPerDevice();

    // 기간별 위치 데이터
    Page<SndEventList> findByImeiAndRegDateBetweenOrderByIdxDesc(
            String imei, String startDate, String endDate, Pageable pageable);

    List<SndEventList> findByRegDateBetweenOrderByRegDateDesc(String start, String end);

    @Query("SELECT s FROM SndEventList s WHERE s.regDate >= :start AND s.regDate <= :end ORDER BY s.regDate DESC")
    List<SndEventList> findByRegDateRange(@Param("start") String start, @Param("end") String end);
}