package ai.kolate.enterprise_manager.repository;

import ai.kolate.enterprise_manager.model.*;
import ai.kolate.enterprise_manager.model.Module;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EnterpriseModuleAccessRepository extends JpaRepository<EnterpriseModuleAccess, Integer> {

    // Find by Enterprise ID
    @Query("SELECT ema FROM EnterpriseModuleAccess ema WHERE ema.enterprise.id = :enterpriseId")
    List<EnterpriseModuleAccess> findByEnterpriseId(@Param("enterpriseId") UUID enterpriseId);

    // Find by Organization ID
    List<EnterpriseModuleAccess> findByOrganizationId(String organizationId);

    // Find by Enterprise, Module and Trial (for checking duplicates)
    Optional<EnterpriseModuleAccess> findByEnterpriseAndModuleAndTrial(
            Enterprise enterprise,
            Module module,
            Trial trial
    );

    // Check existence by Enterprise, Module and Trial
    boolean existsByEnterpriseAndModuleAndTrial(
            Enterprise enterprise,
            Module module,
            Trial trial
    );
}