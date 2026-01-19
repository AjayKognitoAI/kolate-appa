package ai.kolate.enterprise_manager.controller;


import ai.kolate.enterprise_manager.dto.GlobalResponse;
import ai.kolate.enterprise_manager.dto.EnterpriseModuleAccess.*;
import ai.kolate.enterprise_manager.service.EnterpriseModuleAccessService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/enterprise-manager")
@Slf4j
@RequiredArgsConstructor
public class EnterpriseModuleAccessController {

    private final EnterpriseModuleAccessService accessService;

    /**
     * Manage enterprise access (grant and revoke)
     * @param requestDTO The access management request
     * @return A response entity with the management result
     */
    @PostMapping("/v1/enterprise-access")
    public ResponseEntity<GlobalResponse> manageEnterpriseAccess(
            @Valid @RequestBody EnterpriseModuleAccessRequestDTO requestDTO) {
        try {
            EnterpriseModuleAccessResultDTO result = accessService.manageEnterpriseAccess(requestDTO);

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(GlobalResponse.builder()
                            .state("success")
                            .status(HttpStatus.CREATED.toString())
                            .message("Enterprise access managed successfully")
                            .data(result)
                            .build());
        } catch (EntityNotFoundException e) {
            log.error("Error managing enterprise access: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(GlobalResponse.builder()
                            .state("error")
                            .status(HttpStatus.NOT_FOUND.toString())
                            .message(e.getMessage())
                            .data(null)
                            .build());
        } catch (IllegalArgumentException e) {
            log.error("Error managing enterprise access: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(GlobalResponse.builder()
                            .state("error")
                            .status(HttpStatus.BAD_REQUEST.toString())
                            .message(e.getMessage())
                            .data(null)
                            .build());
        } catch (Exception e) {
            log.error("Unexpected error managing enterprise access: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(GlobalResponse.builder()
                            .state("error")
                            .status(HttpStatus.INTERNAL_SERVER_ERROR.toString())
                            .message("Error managing enterprise access: " + e.getMessage())
                            .data(null)
                            .build());
        }
    }

    /**
     * Get access records by organization ID
     * @param organizationId The organization ID
     * @return A response entity with access records
     */
    @GetMapping("/v1/enterprise-access/organization/{organizationId}")
    public ResponseEntity<GlobalResponse> getAccessByOrganizationId(@PathVariable String organizationId) {
        try {
            List<ModuleDTO> accessList = accessService.getAccessByOrganizationId(organizationId);

            return ResponseEntity.ok(GlobalResponse.builder()
                    .state("success")
                    .status(HttpStatus.OK.toString())
                    .message(accessList.isEmpty() ?
                            "No access records found for organization ID: " + organizationId :
                            "Access records retrieved successfully")
                    .data(accessList)
                    .build());
        } catch (Exception e) {
            log.error("Error retrieving organization access: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(GlobalResponse.builder()
                            .state("error")
                            .status(HttpStatus.INTERNAL_SERVER_ERROR.toString())
                            .message("Error retrieving organization access: " + e.getMessage())
                            .data(null)
                            .build());
        }
    }

    @GetMapping("/v1/enterprise-access/full/{enterpriseId}")
    public ResponseEntity<GlobalResponse> getFullAccessByEnterprise(@PathVariable UUID enterpriseId) {
        try {
            List<ModuleDTO> result = accessService.getAllModulesAndTrialsByEnterprise(enterpriseId);

            return ResponseEntity.ok(GlobalResponse.builder()
                    .state("success")
                    .status(HttpStatus.OK.toString())
                    .message(result.isEmpty() ?
                            "No modules found for enterprise ID: " + enterpriseId :
                            "Modules and trial access retrieved successfully")
                    .data(result)
                    .build());
        } catch (Exception e) {
            log.error("Error retrieving full module/trial access: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(GlobalResponse.builder()
                            .state("error")
                            .status(HttpStatus.INTERNAL_SERVER_ERROR.toString())
                            .message("Error retrieving full module/trial access: " + e.getMessage())
                            .data(null)
                            .build());
        }
    }
}

