package ai.kolate.postgres_database_manager.repository;

import ai.kolate.postgres_database_manager.dto.project.DefaultRolePermissionDTO;
import ai.kolate.postgres_database_manager.model.DefaultRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DefaultRoleRepository extends JpaRepository<DefaultRole, UUID> {

    @Query("SELECT DISTINCT dr FROM DefaultRole dr LEFT JOIN FETCH dr.permissions")
    List<DefaultRole> findAllWithPermissions();

    @Query(value = """
    SELECT
    dr.id AS roleId,
    dr.name AS roleName,
    dr.description AS description,
    dp.module AS module,
    dp.access_type AS accessType
    FROM default_roles dr
    LEFT JOIN default_permissions dp ON dr.id = dp.default_role_id
    """, nativeQuery = true)
    List<DefaultRolePermissionDTO> findAllDefaultRolePermissionsFlat();
}
