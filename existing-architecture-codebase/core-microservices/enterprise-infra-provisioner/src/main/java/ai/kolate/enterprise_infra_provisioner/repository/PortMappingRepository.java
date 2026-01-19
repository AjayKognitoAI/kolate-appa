package ai.kolate.enterprise_infra_provisioner.repository;

import ai.kolate.enterprise_infra_provisioner.model.PortMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PortMappingRepository extends JpaRepository<PortMapping, String> {
    Optional<PortMapping> findByPort(int port);
}
