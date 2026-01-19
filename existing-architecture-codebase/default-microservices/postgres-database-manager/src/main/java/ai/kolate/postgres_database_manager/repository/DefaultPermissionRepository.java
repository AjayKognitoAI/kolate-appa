package ai.kolate.postgres_database_manager.repository;

import ai.kolate.postgres_database_manager.model.DefaultPermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface DefaultPermissionRepository extends JpaRepository<DefaultPermission, UUID> {
}
