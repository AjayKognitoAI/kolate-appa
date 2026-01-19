package ai.kolate.enterprise_manager.repository;

import ai.kolate.enterprise_manager.model.EnterpriseDatasource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EnterpriseDatasourceRepository extends JpaRepository<EnterpriseDatasource, UUID> {
    
    /**
     * Find datasource by organization ID
     * @param organizationId the organization ID
     * @return an optional containing the datasource if found
     */
    Optional<EnterpriseDatasource> findByOrganizationId(String organizationId);

    Optional<EnterpriseDatasource> findByOrganizationIdAndDbType(String organizationId, String dbType);
    
    /**
     * Find all datasources by organization ID
     * @param organizationId the organization ID
     * @return a list of datasources for the organization
     */
    List<EnterpriseDatasource> findAllByOrganizationId(String organizationId);
    
    /**
     * Check if a datasource exists for a specific organization
     * @param organizationId the organization ID
     * @return true if datasource exists, false otherwise
     */
    boolean existsByOrganizationId(String organizationId);

    boolean existsByOrganizationIdAndDbType(String organizationId, String dbType);
}
