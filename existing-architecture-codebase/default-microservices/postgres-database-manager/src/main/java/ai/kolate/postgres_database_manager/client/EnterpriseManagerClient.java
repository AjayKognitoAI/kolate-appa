package ai.kolate.postgres_database_manager.client;

import ai.kolate.postgres_database_manager.dto.GlobalResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

/**
 * Feign client for the Enterprise Manager service.
 * Used to fetch datasource details based on organization ID.
 */
@FeignClient(name = "${feign.clients.enterprise-manager.name}",
        path = "${feign.clients.enterprise-manager.path}")
public interface EnterpriseManagerClient {
    
    /**
     * Get datasource details for an organization.
     *
     * @param organizationId The organization ID
     * @return Response containing datasource details
     */
    @GetMapping("/v1/datasources/organization/{organizationId}/type/{dbType}")
    GlobalResponse getDatasourceByOrganizationId(@PathVariable String organizationId, @PathVariable String dbType);
}
