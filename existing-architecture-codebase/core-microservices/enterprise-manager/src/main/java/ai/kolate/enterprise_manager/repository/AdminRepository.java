package ai.kolate.enterprise_manager.repository;

import ai.kolate.enterprise_manager.model.Admin;
import ai.kolate.enterprise_manager.model.enums.UserType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AdminRepository extends JpaRepository<Admin, UUID> {

    Optional<Admin> findByAuth0Id(String auth0Id);

    Optional<Admin> findByEmail(String email);

    List<Admin> findByEnterpriseId(UUID enterpriseId);

    List<Admin> findByOrganizationId(String organizationId);

    List<Admin> findByUserType(UserType userType);

    @Query("SELECT a FROM Admin a WHERE a.enterprise.id = :enterpriseId AND a.userType = :userType")
    List<Admin> findByEnterpriseIdAndUserType(@Param("enterpriseId") UUID enterpriseId, @Param("userType") UserType userType);

    boolean existsByEmailAndEnterpriseId(String email, UUID enterpriseId);

    boolean existsByAuth0Id(String auth0Id);
}
