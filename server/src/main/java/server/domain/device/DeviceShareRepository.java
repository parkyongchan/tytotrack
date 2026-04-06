package server.domain.device;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DeviceShareRepository extends JpaRepository<DeviceShare, Long> {
    List<DeviceShare> findByImei(String imei);
    List<DeviceShare> findBySharedLoginId(String sharedLoginId);
    boolean existsByImeiAndSharedLoginId(String imei, String sharedLoginId);
    void deleteByImeiAndSharedLoginId(String imei, String sharedLoginId);
}