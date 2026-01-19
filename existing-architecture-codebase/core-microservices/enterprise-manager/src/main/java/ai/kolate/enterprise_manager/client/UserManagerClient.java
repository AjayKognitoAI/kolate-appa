package ai.kolate.enterprise_manager.client;

import ai.kolate.enterprise_manager.config.FeignConfig;
import ai.kolate.enterprise_manager.dto.EnterpriseOnboardProgress.UserCountResponseDTO;
import ai.kolate.enterprise_manager.dto.PagedResponse;
import ai.kolate.enterprise_manager.dto.project.ProjectStatsResponse;
import ai.kolate.enterprise_manager.dto.project.ProjectSummaryResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "${feign.clients.user-manager.name}",
        path = "${feign.clients.user-manager.path}",
        configuration = FeignConfig.class)
public interface UserManagerClient {
    @GetMapping("/v1/users/get-count")
    UserCountResponseDTO getUsersCount(@RequestHeader("org-id") String orgId);
}
