package ai.kolate.enterprise_manager.controller;

import ai.kolate.enterprise_manager.dto.EnterpriseOnboardProgress.EnterpriseStatisticsDTO;
import ai.kolate.enterprise_manager.dto.EnterpriseOnboardProgress.RequestUpdateEnterpriseProgress;
import ai.kolate.enterprise_manager.dto.EnterpriseOnboardProgress.ResponseEopDTO;
import ai.kolate.enterprise_manager.dto.GlobalResponse;
import ai.kolate.enterprise_manager.model.enums.EnterpriseOnboardStep;
import ai.kolate.enterprise_manager.service.EnterpriseOnboardProgressService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/enterprise-manager")
@RequiredArgsConstructor
public class EnterPriseOnboardingProgressController {
    private final HttpServletRequest servletRequest;
    private final EnterpriseOnboardProgressService eopService;

    @GetMapping("/v1/enterprise/statistics")
    public ResponseEntity<GlobalResponse> getEnterpriseDashboardStatistics(
            @RequestHeader("org-id") String organizationId
    ){
        try {
            EnterpriseStatisticsDTO statistics = eopService.getEnterpriseStatistics(organizationId);

            GlobalResponse response = GlobalResponse.builder()
                    .state("SUCCESS")
                    .status("SUCCESS")
                    .message("Fetched enterprise statistics successfully")
                    .data(statistics)
                    .build();

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            GlobalResponse response = GlobalResponse.builder()
                    .state("FAILED")
                    .status("ERROR")
                    .message("Failed to fetch enterprise statistics: " + e.getMessage())
                    .data(null)
                    .build();

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/v1/onboarding-progress")
    public ResponseEntity<GlobalResponse> getEnterpriseOnboardProgress(
            @RequestHeader("org-id") String organizationId
    ){
        try {
            ResponseEopDTO enterpriseProgress = eopService.getEnterpriseProgress(organizationId);

            GlobalResponse response = GlobalResponse.builder()
                    .state("SUCCESS")
                    .status("SUCCESS")
                    .message("Fetched enterprise onboard progress successfully")
                    .data(enterpriseProgress)
                    .build();

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            GlobalResponse response = GlobalResponse.builder()
                    .state("FAILED")
                    .status("ERROR")
                    .message("Failed to fetch enterprise onboard progress: " + e.getMessage())
                    .data(null)
                    .build();

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PutMapping("/v1/onboarding-progress")
    public ResponseEntity<GlobalResponse> updateEnterpriseOnboardProgress(
            @RequestHeader("org-id") String organizationId,
            @RequestBody RequestUpdateEnterpriseProgress request
    ){
        try {
            ResponseEopDTO enterpriseProgress = eopService.updateEnterpriseProgress(organizationId, request);

            GlobalResponse response = GlobalResponse.builder()
                    .state("SUCCESS")
                    .status("SUCCESS")
                    .message("Updated enterprise onboard progress successfully")
                    .data(enterpriseProgress)
                    .build();

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            GlobalResponse response = GlobalResponse.builder()
                    .state("FAILED")
                    .status("ERROR")
                    .message("Failed to update enterprise onboard progress: " + e.getMessage())
                    .data(null)
                    .build();

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}