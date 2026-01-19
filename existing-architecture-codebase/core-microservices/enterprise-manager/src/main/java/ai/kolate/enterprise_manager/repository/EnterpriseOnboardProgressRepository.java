package ai.kolate.enterprise_manager.repository;

import ai.kolate.enterprise_manager.model.EnterpriseOnboardingProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface EnterpriseOnboardProgressRepository extends JpaRepository<EnterpriseOnboardingProgress, UUID> {
    public Optional<EnterpriseOnboardingProgress> findByOrganizationId(String organizationId);
}
