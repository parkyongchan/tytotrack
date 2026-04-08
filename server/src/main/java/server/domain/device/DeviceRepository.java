package server.domain.device;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DeviceRepository extends JpaRepository<Device, Long> {
    Optional<Device> findByImei(String imei);
    boolean existsByImei(String imei);
    List<Device> findByActiveTrue();
    Optional<Device> findByImeiAndActiveTrue(String imei);
    java.util.List<Device> findByImeiInAndActiveTrue(java.util.List<String> imeis);
    Page<Device> findByActiveTrue(Pageable pageable);
}