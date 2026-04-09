package server.domain.device;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DeviceRepository extends JpaRepository<Device, Long> {
    Optional<Device> findByImei(String imei);
    boolean existsByImei(String imei);
    boolean existsByImeiAndActiveTrue(String imei);
    List<Device> findByActiveTrue();
    Optional<Device> findByImeiAndActiveTrue(String imei);
    List<Device> findByImeiInAndActiveTrue(List<String> imeis);
    Page<Device> findByActiveTrue(Pageable pageable);
    List<Device> findByRegisteredByCompanyAndActiveTrue(String companyId);
    List<Device> findByRegisteredByAndActiveTrue(String registeredBy);
    List<Device> findByRegisteredByCompanyAndDeletedAtIsNull(String companyId);
    List<Device> findByRegisteredByAndDeletedAtIsNull(String registeredBy);
    List<Device> findByDeletedAtIsNull();
    List<Device> findByRegisteredByCompany(String companyId);
    List<Device> findByRegisteredBy(String registeredBy);
}