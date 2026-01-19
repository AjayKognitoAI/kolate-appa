package ai.kolate.enterprise_manager.repository;

import ai.kolate.enterprise_manager.model.Enterprise;
import ai.kolate.enterprise_manager.model.enums.EnterpriseStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EnterpriseRepository extends JpaRepository<Enterprise, UUID> {

    Optional<Enterprise> findByOrganizationId(String organizationId);

    Optional<Enterprise> findByDomain(String domain);

    Optional<Enterprise> findByAdminEmail(String adminEmail);

    List<Enterprise> findByStatus(EnterpriseStatus status);
    
    Page<Enterprise> findByStatus(EnterpriseStatus status, Pageable pageable);

    @Query("SELECT e FROM Enterprise e WHERE e.name LIKE %:keyword% OR e.description LIKE %:keyword%")
    List<Enterprise> searchByNameOrDescription(@Param("keyword") String keyword);
    
    @Query("SELECT e FROM Enterprise e WHERE e.name LIKE %:keyword% OR e.description LIKE %:keyword%")
    Page<Enterprise> searchByNameOrDescription(@Param("keyword") String keyword, Pageable pageable);

    boolean existsByDomain(String domain);

    boolean existsByOrganizationId(String organizationId);

    long count(); // total enterprises

    long countByStatus(EnterpriseStatus status); // filtered count
}
