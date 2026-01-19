package ai.kolate.postgres_database_manager.repository;

import ai.kolate.postgres_database_manager.dto.project.RolePermissionDTO;
import ai.kolate.postgres_database_manager.model.Permission;
import feign.Param;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface PermissionRepository extends JpaRepository<Permission, UUID> {
    @Modifying
    @Transactional
    @Query("DELETE FROM Permission p WHERE p.role.id = :roleId")
    void deleteAllByRoleId(@Param("roleId") UUID roleId);

    List<Permission> findByRoleId(UUID roleId);

    @Query(value = """
    SELECT 
    p.module AS module,
    p.access_type AS accessType
    FROM permissions p
    WHERE p.role_id = :roleId
    """, nativeQuery = true)
    List<RolePermissionDTO> findPermissionsByRoleId(@org.springframework.data.repository.query.Param("roleId") UUID roleId);
}
