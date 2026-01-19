package ai.kolate.enterprise_manager.controller;

import ai.kolate.enterprise_manager.dto.GlobalResponse;
import ai.kolate.enterprise_manager.dto.datasource.EnterpriseDatasourceRequestDto;
import ai.kolate.enterprise_manager.dto.datasource.EnterpriseDatasourceResponseDto;
import ai.kolate.enterprise_manager.dto.datasource.EnterpriseDatasourceUpdateDto;
import ai.kolate.enterprise_manager.service.EnterpriseDatasourceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/internal/enterprise-manager")
@RequiredArgsConstructor
public class EnterpriseDatasourceController {

    private final EnterpriseDatasourceService datasourceService;

    /**
     * Create a new enterprise datasource
     * @param requestDto The datasource request details
     * @return A response entity with the created datasource
     */
    @PostMapping("/v1/datasources")
    public ResponseEntity<GlobalResponse> createDatasource(@Valid @RequestBody EnterpriseDatasourceRequestDto requestDto) {
        EnterpriseDatasourceResponseDto responseDto = datasourceService.createDatasource(requestDto);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(GlobalResponse.builder()
                        .state("success")
                        .status(HttpStatus.CREATED.toString())
                        .message("Datasource created successfully")
                        .data(responseDto)
                        .build());
    }

    /**
     * Get datasource by ID
     * @param id The datasource ID
     * @return A response entity with the datasource details
     */
    @GetMapping("/v1/datasources/{id}")
    public ResponseEntity<GlobalResponse> getDatasourceById(@PathVariable UUID id) {
        EnterpriseDatasourceResponseDto responseDto = datasourceService.getDatasourceById(id);
        return ResponseEntity.ok(GlobalResponse.builder()
                .state("success")
                .status(HttpStatus.OK.toString())
                .message("Datasource retrieved successfully")
                .data(responseDto)
                .build());
    }

    /**
     * Get datasource by organization ID
     * @param organizationId The organization ID
     * @return A response entity with the datasource details
     */
    @GetMapping("/v1/datasources/organization/{organizationId}")
    public ResponseEntity<GlobalResponse> getDatasourceByOrganizationId(@PathVariable String organizationId) {
        EnterpriseDatasourceResponseDto responseDto = getDatasourceByOrganizationIdCached(organizationId);
        return ResponseEntity.ok(GlobalResponse.builder()
                .state("success")
                .status(HttpStatus.OK.toString())
                .message("Datasource retrieved successfully")
                .data(responseDto)
                .build());
    }

    @GetMapping("/v1/datasources/organization/{organizationId}/type/{dbType}")
    public ResponseEntity<GlobalResponse> getDatasourceByOrgAndType(
            @PathVariable String organizationId,
            @PathVariable String dbType) {
        EnterpriseDatasourceResponseDto responseDto = getDatasourceByOrganizationIdAndDbTypeCached(organizationId, dbType);
        return ResponseEntity.ok(GlobalResponse.builder()
                .state("success")
                .status(HttpStatus.OK.toString())
                .message("Datasource retrieved successfully")
                .data(responseDto)
                .build());
    }
    
    /**
     * Cached method to get datasource by organization ID
     * This pattern avoids caching the ResponseEntity itself
     * @param organizationId The organization ID
     * @return The datasource response DTO
     */
    @Cacheable(value = "datasourceByOrganization", key = "#organizationId")
    public EnterpriseDatasourceResponseDto getDatasourceByOrganizationIdCached(String organizationId) {
        return datasourceService.getDatasourceByOrganizationId(organizationId);
    }

    @Cacheable(value = "datasourceByOrganization", key = "#organizationId + '_' + #dbType")
    public EnterpriseDatasourceResponseDto getDatasourceByOrganizationIdAndDbTypeCached(String organizationId, String dbType) {
        return datasourceService.getDatasourceByOrganizationIdAndDbType(organizationId, dbType);
    }

    /**
     * Get all datasources for an organization
     * @param organizationId The organization ID
     * @return A response entity with the list of datasources
     */
    @GetMapping("/v1/datasources/organization/{organizationId}/all")
    public ResponseEntity<GlobalResponse> getAllDatasourcesByOrganizationId(@PathVariable String organizationId) {
        List<EnterpriseDatasourceResponseDto> responseDtos = datasourceService.getAllDatasourcesByOrganizationId(organizationId);
        return ResponseEntity.ok(GlobalResponse.builder()
                .state("success")
                .status(HttpStatus.OK.toString())
                .message("Datasources retrieved successfully")
                .data(responseDtos)
                .build());
    }

    /**
     * Get all datasources
     * @return A response entity with all datasources
     */
    @GetMapping("/v1/datasources")
    public ResponseEntity<GlobalResponse> getAllDatasources() {
        List<EnterpriseDatasourceResponseDto> responseDtos = datasourceService.getAllDatasources();
        return ResponseEntity.ok(GlobalResponse.builder()
                .state("success")
                .status(HttpStatus.OK.toString())
                .message("All datasources retrieved successfully")
                .data(responseDtos)
                .build());
    }

    /**
     * Update datasource
     * @param id The datasource ID
     * @param updateDto The update details
     * @return A response entity with the updated datasource
     */
    @PutMapping("/v1/datasources/{id}")
    public ResponseEntity<GlobalResponse> updateDatasource(
            @PathVariable UUID id, 
            @Valid @RequestBody EnterpriseDatasourceUpdateDto updateDto) {
        EnterpriseDatasourceResponseDto responseDto = datasourceService.updateDatasource(id, updateDto);
        return ResponseEntity.ok(GlobalResponse.builder()
                .state("success")
                .status(HttpStatus.OK.toString())
                .message("Datasource updated successfully")
                .data(responseDto)
                .build());
    }

    /**
     * Delete datasource
     * @param id The datasource ID
     * @return A response entity with the deletion status
     */
    @DeleteMapping("/v1/datasources/{id}")
    public ResponseEntity<GlobalResponse> deleteDatasource(@PathVariable UUID id) {
        datasourceService.deleteDatasource(id);
        return ResponseEntity.ok(GlobalResponse.builder()
                .state("success")
                .status(HttpStatus.OK.toString())
                .message("Datasource deleted successfully")
                .data(null)
                .build());
    }

    /**
     * Check if datasource exists for an organization
     * @param organizationId The organization ID to check
     * @return A response entity with the existence status
     */
    @GetMapping("/v1/datasources/check/organization")
    public ResponseEntity<GlobalResponse> checkDatasourceExistsForOrganization(@RequestParam String organizationId) {
        boolean exists = datasourceService.datasourceExistsForOrganization(organizationId);
        return ResponseEntity.ok(GlobalResponse.builder()
                .state("success")
                .status(HttpStatus.OK.toString())
                .message("Datasource existence check completed")
                .data(exists)
                .build());
    }

    @GetMapping("/v1/datasources/check")
    public ResponseEntity<GlobalResponse> checkDatasourceExists(
            @RequestParam String organizationId,
            @RequestParam String dbType) {
        boolean exists = datasourceService.datasourceExistsForOrganizationAndType(organizationId, dbType);
        return ResponseEntity.ok(GlobalResponse.builder()
                .state("success")
                .status(HttpStatus.OK.toString())
                .message("Datasource existence check completed")
                .data(exists)
                .build());
    }

}
