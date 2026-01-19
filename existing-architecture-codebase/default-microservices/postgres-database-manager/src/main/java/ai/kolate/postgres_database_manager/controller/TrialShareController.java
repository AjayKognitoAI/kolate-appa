package ai.kolate.postgres_database_manager.controller;

import ai.kolate.postgres_database_manager.dto.PageableRequest;
import ai.kolate.postgres_database_manager.dto.PagedResponse;
import ai.kolate.postgres_database_manager.dto.trialShare.ShareTrialRequest;
import ai.kolate.postgres_database_manager.dto.trialShare.TrialShareResponse;
import ai.kolate.postgres_database_manager.service.TrialShareService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/internal/postgres-database-manager/v1/trial-share/{projectId}/{trialSlug}")
public class TrialShareController {

    private final TrialShareService trialShareService;

    /**
     * Share trial execution with a team
     */
    @PostMapping
    public ResponseEntity<TrialShareResponse> shareTrialWithTeam(
            @PathVariable UUID projectId,
            @PathVariable String trialSlug,
            @RequestBody ShareTrialRequest request) {

        log.info("Sharing trial [{}:{}] executionId={}", projectId, trialSlug, request.getExecutionId());

        TrialShareResponse saved = trialShareService.shareTrialWithTeam(
                projectId,
                trialSlug,
                request
        );

        return ResponseEntity.ok(saved);
    }

    /**
     * Get sent or received shares for the logged-in user
     */
    @GetMapping("/{userId}/{direction}")  // direction = "sent" | "received"
    public ResponseEntity<PagedResponse<TrialShareResponse>> getTrialShares(
            @PathVariable UUID projectId,
            @PathVariable String trialSlug,
            @PathVariable String direction,
            @PathVariable String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String query) {

        Pageable pageable = PageRequest.of(page, size);

        PagedResponse<TrialShareResponse> response = trialShareService.getTrialShares(
                projectId,
                trialSlug,
                userId,
                direction,
                query,
                pageable
        );

        return ResponseEntity.ok(response);
    }
}