package ai.kolate.postgres_database_manager.repository;

import ai.kolate.postgres_database_manager.dto.project.RolePermissionDTO;
import ai.kolate.postgres_database_manager.dto.project.RoleResponseDTO;
import ai.kolate.postgres_database_manager.model.Permission;
import ai.kolate.postgres_database_manager.model.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RoleRepository extends JpaRepository<Role, UUID> {
    /**
     * Find all roles for a specific project
     */
    @Query("SELECT r FROM Role r WHERE r.project.id = :projectId")
    List<Role> findByProjectId(@Param("projectId") UUID projectId);

    /**
     * Find role by name and project
     */
    @Query("SELECT r FROM Role r WHERE r.name = :name AND r.project.id = :projectId")
    Optional<Role> findByNameAndProjectId(@Param("name") String name, @Param("projectId") UUID projectId);

    /**
     * Find role by name across all projects (for default role lookup)
     */
    Optional<Role> findByName(String name);

    /**
     * Find roles with their permissions for a project
     */
    @Query("SELECT r FROM Role r LEFT JOIN FETCH r.permissions WHERE r.project.id = :projectId")
    List<Role> findByProjectIdWithPermissions(@Param("projectId") UUID projectId);

    /**
     * Find role with permissions by role ID
     */
    @Query("SELECT DISTINCT  r FROM Role r LEFT JOIN FETCH r.permissions WHERE r.id = :roleId")
    Optional<Role> findByIdWithPermissions(@Param("roleId") UUID roleId);

    @Query(value = """
    SELECT\s
    r.id AS roleId,
    r.name AS roleName,
    r.description AS roleDescription,
    p.module AS module,
    p.access_type AS accessType
    FROM roles r
    LEFT JOIN permissions p ON r.id = p.role_id
    WHERE r.id = :roleId
   \s""", nativeQuery = true)
    List<RolePermissionDTO> findRoleWithPermissionsById(@Param("roleId") UUID roleId);
}
