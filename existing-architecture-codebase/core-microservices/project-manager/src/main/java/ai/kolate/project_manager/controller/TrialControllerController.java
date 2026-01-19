package ai.kolate.project_manager.controller;

import ai.kolate.project_manager.dto.*;
import ai.kolate.project_manager.dto.trial.ShareTrialRequestDTO;
import ai.kolate.project_manager.dto.trial.TrialShareResponseDTO;
import ai.kolate.project_manager.model.enums.RequestStatus;
import ai.kolate.project_manager.service.ProjectService;
import ai.kolate.project_manager.service.TrialService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang.StringUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;


@RestController
@RequestMapping("/api/project-manager")
@RequiredArgsConstructor
@Slf4j
public class TrialControllerController {
    
    private final TrialService trialService;

    @PostMapping("/v1/trial-share/{projectId}/{trialSlug}")
    public ResponseEntity<GlobalResponse> createProject(
            @PathVariable String projectId,
            @PathVariable String trialSlug,
            @RequestHeader("org-id") String orgId,
            @Valid @RequestBody ShareTrialRequestDTO request) {
        try {
            log.info("Sharing trial id: {} with :{}", request.getExecutionId(), request.getRecipients());
            TrialShareResponseDTO trialResponse = trialService.createTrialShare(orgId, projectId, trialSlug ,request);

            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.SUCCESS)
                    .status("CREATED")
                    .message("Trial shared successfully")
                    .data(trialResponse)
                    .build();

            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            log.error("Failed to share Trial: {}", e.getMessage());
            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.FAILED)
                    .status("ERROR")
                    .message("Failed to share Trial: " + e.getMessage())
                    .data(null)
                    .build();

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/v1/trial-share/{projectId}/{trialSlug}/{userId}/{direction}")
    public ResponseEntity<GlobalResponse> getTrialShares(
            @PathVariable String projectId,
            @PathVariable String trialSlug,
            @PathVariable String direction,
            @PathVariable String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String query) {
        try {
            log.info("Get trial share with user id with :{}", userId);
            PagedResponse<TrialShareResponseDTO> trialResponse = trialService.getTrialShares(
                    projectId,trialSlug, direction, userId, page, size, query);

            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.SUCCESS)
                    .status("CREATED")
                    .message("Trial shares fetched successfully")
                    .data(trialResponse)
                    .build();

            return ResponseEntity.status(HttpStatus.OK).body(response);
        } catch (Exception e) {
            log.error("Failed to get share Trial: {}", e);
            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.FAILED)
                    .status("ERROR")
                    .message("Failed to share Trial: " + e.getMessage())
                    .data(null)
                    .build();

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}

