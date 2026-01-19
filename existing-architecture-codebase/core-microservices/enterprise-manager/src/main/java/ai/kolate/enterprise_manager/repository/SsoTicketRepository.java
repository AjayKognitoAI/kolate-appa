package ai.kolate.enterprise_manager.repository;

import ai.kolate.enterprise_manager.model.SsoTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SsoTicketRepository extends JpaRepository<SsoTicket, UUID> {

    Optional<SsoTicket> findByAdminEmail(String adminEmail);

    List<SsoTicket> findByEnterpriseId(UUID enterpriseId);

    List<SsoTicket> findByOrganizationId(String organizationId);

    List<SsoTicket> findByCreatedAtBefore(LocalDateTime dateTime);

    void deleteByCreatedAtBefore(LocalDateTime dateTime);

    boolean existsByAdminEmailAndCreatedAtAfter(String adminEmail, LocalDateTime dateTime);
}
