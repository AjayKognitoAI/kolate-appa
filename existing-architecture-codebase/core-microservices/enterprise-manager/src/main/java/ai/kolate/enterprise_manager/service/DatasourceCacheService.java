package ai.kolate.enterprise_manager.service;

import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;

/**
 * Service for managing datasource cache operations
 */
@Service
@RequiredArgsConstructor
public class DatasourceCacheService {
    
    /**
     * Evict a datasource from cache by organization ID
     * @param organizationId the organization ID
     */
    @CacheEvict(value = "datasourceByOrganization", key = "#organizationId")
    public void evictDatasourceCache(String organizationId) {
        // Just to evict the cache, no implementation needed
    }
}
