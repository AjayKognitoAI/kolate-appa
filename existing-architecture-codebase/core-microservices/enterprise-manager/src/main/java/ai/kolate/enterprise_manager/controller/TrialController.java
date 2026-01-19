package ai.kolate.enterprise_manager.controller;

import ai.kolate.enterprise_manager.dto.trial.TrialCreateDTO;
import ai.kolate.enterprise_manager.dto.trial.TrialDTO;
import ai.kolate.enterprise_manager.dto.trial.TrialResponseDTO;
import ai.kolate.enterprise_manager.dto.trial.TrialUpdateDTO;
import ai.kolate.enterprise_manager.service.TrialService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/api/enterprise-manager")
@Slf4j
@RequiredArgsConstructor
public class TrialController {

    private final TrialService trialService;

    @PostMapping("/v1/trials")
    public ResponseEntity<TrialResponseDTO> createTrial(
            @Valid @RequestBody TrialCreateDTO trialCreateDTO) {
        try {
            TrialDTO createdTrial = trialService.createTrial(trialCreateDTO);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(TrialResponseDTO.builder()
                            .trials(Collections.singletonList(createdTrial))
                            .message("Trial created successfully")
                            .success(true)
                            .build());
        } catch (EntityNotFoundException e) {
            log.error("Error creating trial: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(TrialResponseDTO.builder()
                            .message(e.getMessage())
                            .success(false)
                            .build());
        } catch (IllegalArgumentException e) {
            log.error("Error creating trial: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(TrialResponseDTO.builder()
                            .message(e.getMessage())
                            .success(false)
                            .build());
        } catch (Exception e) {
            log.error("Unexpected error creating trial: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(TrialResponseDTO.builder()
                            .message("Error creating trial: " + e.getMessage())
                            .success(false)
                            .build());
        }
    }

    @PutMapping("/v1/trials")
    public ResponseEntity<TrialResponseDTO> updateTrial(
            @Valid @RequestBody TrialUpdateDTO trialUpdateDTO) {
        try {
            TrialDTO updatedTrial = trialService.updateTrial(trialUpdateDTO);
            return ResponseEntity.ok(TrialResponseDTO.builder()
                    .trials(Collections.singletonList(updatedTrial))
                    .message("Trial updated successfully")
                    .success(true)
                    .build());
        } catch (EntityNotFoundException e) {
            log.error("Error updating trial: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(TrialResponseDTO.builder()
                            .message(e.getMessage())
                            .success(false)
                            .build());
        } catch (IllegalArgumentException e) {
            log.error("Error updating trial: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(TrialResponseDTO.builder()
                            .message(e.getMessage())
                            .success(false)
                            .build());
        } catch (Exception e) {
            log.error("Unexpected error updating trial: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(TrialResponseDTO.builder()
                            .message("Error updating trial: " + e.getMessage())
                            .success(false)
                            .build());
        }
    }

    @GetMapping("/v1/trials/{id}")
    public ResponseEntity<TrialResponseDTO> getTrialById(@PathVariable Integer id) {
        return trialService.getTrialById(id)
                .map(trial -> ResponseEntity.ok(TrialResponseDTO.builder()
                        .trials(Collections.singletonList(trial))
                        .message("Trial retrieved successfully")
                        .success(true)
                        .build()))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(TrialResponseDTO.builder()
                                .message("Trial not found with ID: " + id)
                                .success(false)
                                .build()));
    }

    @GetMapping("/v1/trials/slug/{slug}")
    public ResponseEntity<TrialResponseDTO> getTrialBySlug(@PathVariable String slug) {
        return trialService.getTrialBySlug(slug)
                .map(trial -> ResponseEntity.ok(TrialResponseDTO.builder()
                        .trials(Collections.singletonList(trial))
                        .message("Trial retrieved successfully")
                        .success(true)
                        .build()))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(TrialResponseDTO.builder()
                                .message("Trial not found with slug: " + slug)
                                .success(false)
                                .build()));
    }

    @GetMapping("/v1/trials")
    public ResponseEntity<TrialResponseDTO> getAllTrials() {
        List<TrialDTO> trials = trialService.getAllTrials();
        return ResponseEntity.ok(TrialResponseDTO.builder()
                .trials(trials)
                .message(trials.isEmpty() ? "No trials found" : "Trials retrieved successfully")
                .success(true)
                .build());
    }

    @GetMapping("/v1/trials/module/{moduleId}")
    public ResponseEntity<TrialResponseDTO> getTrialsByModuleId(@PathVariable Integer moduleId) {
        try {
            List<TrialDTO> trials = trialService.getTrialsByModuleId(moduleId);
            return ResponseEntity.ok(TrialResponseDTO.builder()
                    .trials(trials)
                    .message(trials.isEmpty() ?
                            "No trials found for module ID: " + moduleId :
                            "Trials retrieved successfully")
                    .success(true)
                    .build());
        } catch (EntityNotFoundException e) {
            log.error("Error getting trials by module: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(TrialResponseDTO.builder()
                            .message(e.getMessage())
                            .success(false)
                            .build());
        }
    }

    @DeleteMapping("/v1/trials/{id}")
    public ResponseEntity<TrialResponseDTO> deleteTrialById(@PathVariable Integer id) {
        boolean deleted = trialService.deleteTrialById(id);

        if (deleted) {
            return ResponseEntity.ok(TrialResponseDTO.builder()
                    .message("Trial deleted successfully")
                    .success(true)
                    .build());
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(TrialResponseDTO.builder()
                            .message("Trial not found with ID: " + id)
                            .success(false)
                            .build());
        }
    }

    @GetMapping("/v1/trials/exists/slug/{slug}")
    public ResponseEntity<TrialResponseDTO> existsBySlug(@PathVariable String slug) {
        boolean exists = trialService.existsBySlug(slug);
        return ResponseEntity.ok(TrialResponseDTO.builder()
                .message(exists ?
                        "Trial exists with the provided slug" :
                        "Trial does not exist with the provided slug")
                .success(true)
                .build());
    }
}
