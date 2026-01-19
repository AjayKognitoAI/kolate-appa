package ai.kolate.enterprise_manager.repository;

import ai.kolate.enterprise_manager.model.Module;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ModuleRepository extends JpaRepository<Module, Integer> {
    // Optional: you can create an alias for readability
    @EntityGraph(attributePaths = {"trials"})
    default List<Module> findAllWithTrials(Sort sort) {
        return findAll(sort);
    }
}
