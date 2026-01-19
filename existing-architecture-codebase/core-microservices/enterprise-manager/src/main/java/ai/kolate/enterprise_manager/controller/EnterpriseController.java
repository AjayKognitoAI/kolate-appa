package ai.kolate.enterprise_manager.controller;

import ai.kolate.enterprise_manager.dto.GlobalResponse;
import ai.kolate.enterprise_manager.dto.PagedResponse;
import ai.kolate.enterprise_manager.dto.enterprise.DeleteEnterpriseRequestDto;
import ai.kolate.enterprise_manager.dto.enterprise.EnterpriseRequestDto;
import ai.kolate.enterprise_manager.dto.enterprise.EnterpriseResponseDto;
import ai.kolate.enterprise_manager.dto.enterprise.EnterpriseStatsDto;
import ai.kolate.enterprise_manager.dto.enterprise.EnterpriseUpdateDto;
import ai.kolate.enterprise_manager.dto.project.ProjectStatsResponse;
import ai.kolate.enterprise_manager.dto.project.ProjectSummaryResponse;
import ai.kolate.enterprise_manager.model.enums.EnterpriseOnboardStep;
import ai.kolate.enterprise_manager.model.enums.EnterpriseStatus;
import ai.kolate.enterprise_manager.service.EnterpriseService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang.StringUtils;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/enterprise-manager")
@RequiredArgsConstructor
public class EnterpriseController {

    private final EnterpriseService enterpriseService;
    private final HttpServletRequest servletRequest;

    /**
     * Create a new enterprise
     * @param requestDto The enterprise request details
     * @return A response entity with the created enterprise
     */
    @PostMapping("/v1/enterprises")
    public ResponseEntity<GlobalResponse> createEnterprise(@Valid @RequestBody EnterpriseRequestDto requestDto) {
        EnterpriseResponseDto responseDto = enterpriseService.createEnterprise(requestDto);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(GlobalResponse.builder()
                        .state("success")
                        .status(HttpStatus.CREATED.toString())
                        .message("Enterprise created successfully")
                        .data(responseDto)
                        .build());
    }

    /**
     * Get enterprise by ID
     * @param id The enterprise ID
     * @return A response entity with the enterprise details
     */
    @GetMapping("/v1/enterprises/{id}")
    public ResponseEntity<GlobalResponse> getEnterpriseById(@PathVariable UUID id) {
        EnterpriseResponseDto responseDto = enterpriseService.getEnterpriseById(id);
        return ResponseEntity.ok(GlobalResponse.builder()
                .state("success")
                .status(HttpStatus.OK.toString())
                .message("Enterprise retrieved successfully")
                .data(responseDto)
                .build());
    }

    /**
     * Get enterprise by organization ID
     * @param organizationId The organization ID
     * @return A response entity with the enterprise details
     */
    @GetMapping("/v1/enterprises/{organizationId}/organization")
    public ResponseEntity<GlobalResponse> getEnterpriseByOrganizationId(@PathVariable String organizationId) {
        EnterpriseResponseDto responseDto = enterpriseService.getEnterpriseByOrganizationId(organizationId);
        return ResponseEntity.ok(GlobalResponse.builder()
                .state("success")
                .status(HttpStatus.OK.toString())
                .message("Enterprise retrieved successfully")
                .data(responseDto)
                .build());
    }

    /**
     * Get enterprise by domain
     * @param domain The domain
     * @return A response entity with the enterprise details
     */
    @GetMapping("/v1/enterprises/domain/{domain}")
    public ResponseEntity<GlobalResponse> getEnterpriseByDomain(@PathVariable String domain) {
        EnterpriseResponseDto responseDto = enterpriseService.getEnterpriseByDomain(domain);
        return ResponseEntity.ok(GlobalResponse.builder()
                .state("success")
                .status(HttpStatus.OK.toString())
                .message("Enterprise retrieved successfully")
                .data(responseDto)
                .build());
    }

    /**
     * Get enterprise by admin email
     * @param adminEmail The admin email
     * @return A response entity with the enterprise details
     */
    @GetMapping("/v1/enterprises/admin/{adminEmail}")
    public ResponseEntity<GlobalResponse> getEnterpriseByAdminEmail(@PathVariable String adminEmail) {
        EnterpriseResponseDto responseDto = enterpriseService.getEnterpriseByAdminEmail(adminEmail);
        return ResponseEntity.ok(GlobalResponse.builder()
                .state("success")
                .status(HttpStatus.OK.toString())
                .message("Enterprise retrieved successfully")
                .data(responseDto)
                .build());
    }

    /**
     * Get all enterprises with pagination
     * @param page The page number (0-based)
     * @param size The page size
     * @param sort The sort field
     * @param direction The sort direction ('asc' or 'desc')
     * @return A response entity with paginated enterprises
     */
    @GetMapping("/v1/enterprises")
    public ResponseEntity<GlobalResponse> getAllEnterprises(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "name") String sort,
            @RequestParam(defaultValue = "asc") String direction) {
        
        Page<EnterpriseResponseDto> enterprises = enterpriseService.getAllEnterprisesPaginated(
                page, size, sort, direction);
        
        Map<String, Object> response = new HashMap<>();
        response.put("enterprises", enterprises.getContent());
        response.put("currentPage", enterprises.getNumber());
        response.put("totalItems", enterprises.getTotalElements());
        response.put("totalPages", enterprises.getTotalPages());
        
        return ResponseEntity.ok(GlobalResponse.builder()
                .state("success")
                .status(HttpStatus.OK.toString())
                .message("Enterprises retrieved successfully")
                .data(response)
                .build());
    }

    /**
     * Get enterprises by status
     * @param status The enterprise status
     * @param page The page number (0-based)
     * @param size The page size
     * @param sort The sort field
     * @param direction The sort direction ('asc' or 'desc')
     * @return A response entity with paginated enterprises filtered by status
     */
    @GetMapping("/v1/enterprises/status/{status}")
    public ResponseEntity<GlobalResponse> getEnterprisesByStatus(
            @PathVariable EnterpriseStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "name") String sort,
            @RequestParam(defaultValue = "asc") String direction) {
        
        if (page < 0) {
            List<EnterpriseResponseDto> enterprises = enterpriseService.getEnterprisesByStatus(status);
            return ResponseEntity.ok(GlobalResponse.builder()
                    .state("success")
                    .status(HttpStatus.OK.toString())
                    .message("Enterprises retrieved successfully")
                    .data(enterprises)
                    .build());
        }
        
        Page<EnterpriseResponseDto> enterprises = enterpriseService.getEnterprisesByStatusPaginated(
                status, page, size, sort, direction);
        
        Map<String, Object> response = new HashMap<>();
        response.put("enterprises", enterprises.getContent());
        response.put("currentPage", enterprises.getNumber());
        response.put("totalItems", enterprises.getTotalElements());
        response.put("totalPages", enterprises.getTotalPages());
        
        return ResponseEntity.ok(GlobalResponse.builder()
                .state("success")
                .status(HttpStatus.OK.toString())
                .message("Enterprises retrieved successfully")
                .data(response)
                .build());
    }

    /**
     * Search enterprises by name or description
     * @param keyword The search keyword
     * @param page The page number (0-based)
     * @param size The page size
     * @param sort The sort field
     * @param direction The sort direction ('asc' or 'desc')
     * @return A response entity with paginated matching enterprises
     */
    @GetMapping("/v1/enterprises/search")
    public ResponseEntity<GlobalResponse> searchEnterprises(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "name") String sort,
            @RequestParam(defaultValue = "asc") String direction) {

        if(StringUtils.isEmpty(keyword)) {
            Page<EnterpriseResponseDto> enterprises = enterpriseService.getAllEnterprisesPaginated(
                    page, size, sort, direction);

            Map<String, Object> response = new HashMap<>();
            response.put("enterprises", enterprises.getContent());
            response.put("currentPage", enterprises.getNumber());
            response.put("totalItems", enterprises.getTotalElements());
            response.put("totalPages", enterprises.getTotalPages());

            return ResponseEntity.ok(GlobalResponse.builder()
                    .state("success")
                    .status(HttpStatus.OK.toString())
                    .message("Enterprises retrieved successfully")
                    .data(response)
                    .build());
        }
        
        if (page < 0) {
            List<EnterpriseResponseDto> enterprises = enterpriseService.searchEnterprises(keyword);
            return ResponseEntity.ok(GlobalResponse.builder()
                    .state("success")
                    .status(HttpStatus.OK.toString())
                    .message("Enterprises retrieved successfully")
                    .data(enterprises)
                    .build());
        }
        
        Page<EnterpriseResponseDto> enterprises = enterpriseService.searchEnterprisesPaginated(
                keyword, page, size, sort, direction);
        
        Map<String, Object> response = new HashMap<>();
        response.put("enterprises", enterprises.getContent());
        response.put("currentPage", enterprises.getNumber());
        response.put("totalItems", enterprises.getTotalElements());
        response.put("totalPages", enterprises.getTotalPages());
        
        return ResponseEntity.ok(GlobalResponse.builder()
                .state("success")
                .status(HttpStatus.OK.toString())
                .message("Enterprises retrieved successfully")
                .data(response)
                .build());
    }

    /**
     * Update enterprise
     * @param id The enterprise ID
     * @param updateDto The update details
     * @return A response entity with the updated enterprise
     */
    @PutMapping("/v1/enterprises/{id}")
    public ResponseEntity<GlobalResponse> updateEnterprise(
            @PathVariable UUID id, 
            @Valid @RequestBody EnterpriseUpdateDto updateDto) {
        EnterpriseResponseDto responseDto = enterpriseService.updateEnterprise(id, updateDto);
        return ResponseEntity.ok(GlobalResponse.builder()
                .state("success")
                .status(HttpStatus.OK.toString())
                .message("Enterprise updated successfully")
                .data(responseDto)
                .build());
    }

    @PutMapping("/v1/enterprises/{organization_id}/organization")
    public ResponseEntity<GlobalResponse> updateEnterpriseByOrganizationId(
            @PathVariable("organization_id") String organizationId,
            @Valid @RequestBody EnterpriseUpdateDto updateDto) {
        EnterpriseResponseDto responseDto = enterpriseService.updateEnterpriseWithOrganizationId(organizationId, updateDto);
        return ResponseEntity.ok(GlobalResponse.builder()
                .state("success")
                .status(HttpStatus.OK.toString())
                .message("Enterprise updated successfully")
                .data(responseDto)
                .build());
    }

    /**
     * Update enterprise status
     * @param id The enterprise ID
     * @param status The new status
     * @return A response entity with the updated enterprise
     */
    @PatchMapping("/v1/enterprises/{id}/status")
    public ResponseEntity<GlobalResponse> updateEnterpriseStatus(
            @PathVariable UUID id, 
            @RequestParam EnterpriseStatus status) {
        EnterpriseResponseDto responseDto = enterpriseService.updateEnterpriseStatus(id, status);
        return ResponseEntity.ok(GlobalResponse.builder()
                .state("success")
                .status(HttpStatus.OK.toString())
                .message("Enterprise status updated successfully")
                .data(responseDto)
                .build());
    }

    /**
     * Delete enterprise
     * @param id The enterprise ID
     * @return A response entity with the deletion status
     */
    @DeleteMapping("/v1/enterprises/{id}")
    public ResponseEntity<GlobalResponse> softDeleteEnterprise(@PathVariable UUID id) {
        enterpriseService.softDeleteEnterprise(id);
        return ResponseEntity.ok(GlobalResponse.builder()
                .state("success")
                .status(HttpStatus.OK.toString())
                .message("Enterprise deleted successfully")
                .data(null)
                .build());
    }

    @PostMapping("/v1/enterprises/delete-request")
    public ResponseEntity<GlobalResponse> requestDeleteEnterprise(@RequestBody DeleteEnterpriseRequestDto requestDto) {
        String organizationId = servletRequest.getHeader("org-id");
        String adminId = servletRequest.getHeader("user-id");
        enterpriseService.requestDeleteEnterprise(adminId, organizationId, requestDto);
        return ResponseEntity.ok(GlobalResponse.builder()
                .state("success")
                .status(HttpStatus.OK.toString())
                .message("Enterprise deleted requested successfully")
                .data(null)
                .build());
    }

    /**
     * Check if domain exists
     * @param domain The domain to check
     * @return A response entity with the domain existence status
     */
    @GetMapping("/check/domain")
    public ResponseEntity<GlobalResponse> checkDomainExists(@RequestParam String domain) {
        boolean exists = enterpriseService.domainExists(domain);
        return ResponseEntity.ok(GlobalResponse.builder()
                .state("success")
                .status(HttpStatus.OK.toString())
                .message("Domain check completed")
                .data(exists)
                .build());
    }

    /**
     * Check if organization ID exists
     * @param organizationId The organization ID to check
     * @return A response entity with the organization ID existence status
     */
    @GetMapping("/v1/enterprises/check/organization")
    public ResponseEntity<GlobalResponse> checkOrganizationIdExists(@RequestParam String organizationId) {
        boolean exists = enterpriseService.organizationIdExists(organizationId);
        return ResponseEntity.ok(GlobalResponse.builder()
                .state("success")
                .status(HttpStatus.OK.toString())
                .message("Organization ID check completed")
                .data(exists)
                .build());
    }

    @GetMapping("/v1/enterprises/stats")
    public ResponseEntity<GlobalResponse> getEnterpriseStats() {
        EnterpriseStatsDto stats = enterpriseService.getEnterpriseStats();
        return ResponseEntity.ok(GlobalResponse.builder()
                .state("success")
                .status(HttpStatus.OK.toString())
                .message("Enterprise counts retrieved successfully")
                .data(stats)
                .build());
    }


    @GetMapping("/v1/enterprises/{organizationId}/projects")
    public ResponseEntity<GlobalResponse> getAllEnterpriseProjects(
            @PathVariable("organizationId") String organizationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(name = "sort_by", defaultValue = "createdAt") String sortBy,
            @RequestParam(name = "sort_direction", defaultValue = "desc") String sortDirection
    ) {
        try {
            PagedResponse<ProjectSummaryResponse> pagedResponse = enterpriseService.getAllProjects(page, size, sortBy, sortDirection, organizationId);

            GlobalResponse response = GlobalResponse.builder()
                    .state("SUCCESS")
                    .status("SUCCESS")
                    .message("Projects retrieved successfully")
                    .data(pagedResponse)
                    .build();

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            GlobalResponse response = GlobalResponse.builder()
                    .state("FAILED")
                    .status("ERROR")
                    .message("Failed to retrieve projects: " + e.getMessage())
                    .data(null)
                    .build();

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/v1/enterprises/{organizationId}/projects/statistics")
    public ResponseEntity<GlobalResponse> getAllEnterpriseProjectStats(@PathVariable("organizationId") String organizationId) {
        try {
            ProjectStatsResponse enterpriseProjectStats = enterpriseService.getEnterpriseProjectStats(organizationId);

            GlobalResponse response = GlobalResponse.builder()
                    .state("SUCCESS")
                    .status("SUCCESS")
                    .message("Fetched enterprise stats successfully")
                    .data(enterpriseProjectStats)
                    .build();

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            GlobalResponse response = GlobalResponse.builder()
                    .state("FAILED")
                    .status("ERROR")
                    .message("Failed to fetch enterprise project stats : " + e.getMessage())
                    .data(null)
                    .build();

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}
