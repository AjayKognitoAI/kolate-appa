package ai.kolate.enterprise_manager.repository;

import ai.kolate.enterprise_manager.model.Module;
import ai.kolate.enterprise_manager.model.Trial;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TrialRepository extends JpaRepository<Trial, Integer> {

    List<Trial> findByModule(Module module, Sort sort);

    Optional<Trial> findBySlug(String slug);

    boolean existsBySlug(String slug);

    List<Trial> findByModuleId(Integer moduleId, Sort sort);
}
