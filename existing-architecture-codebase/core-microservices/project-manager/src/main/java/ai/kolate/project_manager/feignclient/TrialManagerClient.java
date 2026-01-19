package ai.kolate.project_manager.feignclient;

import ai.kolate.project_manager.config.FeignClientConfig;
import ai.kolate.project_manager.dto.*;
import ai.kolate.project_manager.dto.trial.ShareTrialRequestDTO;
import ai.kolate.project_manager.dto.trial.TrialShareResponseDTO;
import jakarta.validation.Valid;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@FeignClient(name = "${feign.clients.postgres-database-manager.name}",
        path = "${feign.clients.postgres-database-manager.path}",
        configuration = FeignClientConfig.class)
public interface TrialManagerClient {

    @PostMapping("/v1/trial-share/{projectId}/{trialSlug}")
    TrialShareResponseDTO createTrialShare(
            @PathVariable String projectId,
            @PathVariable String trialSlug,
            @Valid @RequestBody ShareTrialRequestDTO request);

    @GetMapping("/v1/trial-share/{projectId}/{trialSlug}/{userId}/{direction}")
    PagedResponse<TrialShareResponseDTO> getTrialShares(
            @PathVariable String projectId,
            @PathVariable String trialSlug,
            @PathVariable String direction,
            @PathVariable String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String query);
}
