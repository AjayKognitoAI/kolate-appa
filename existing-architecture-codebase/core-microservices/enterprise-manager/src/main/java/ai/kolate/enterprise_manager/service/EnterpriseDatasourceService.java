package ai.kolate.enterprise_manager.service;

import ai.kolate.enterprise_manager.dto.datasource.EnterpriseDatasourceRequestDto;
import ai.kolate.enterprise_manager.dto.datasource.EnterpriseDatasourceResponseDto;
import ai.kolate.enterprise_manager.dto.datasource.EnterpriseDatasourceUpdateDto;

import java.util.List;
import java.util.UUID;

public interface EnterpriseDatasourceService {
    
    /**
     * Create a new enterprise datasource
     * @param requestDto the datasource request DTO
     * @return the created datasource response DTO
     */
    EnterpriseDatasourceResponseDto createDatasource(EnterpriseDatasourceRequestDto requestDto);
    
    /**
     * Get datasource by ID
     * @param id the datasource ID
     * @return the datasource response DTO
     */
    EnterpriseDatasourceResponseDto getDatasourceById(UUID id);
    
    /**
     * Get datasource by organization ID
     * @param organizationId the organization ID
     * @return the datasource response DTO
     */
    EnterpriseDatasourceResponseDto getDatasourceByOrganizationId(String organizationId);

    EnterpriseDatasourceResponseDto getDatasourceByOrganizationIdAndDbType(String organizationId, String dbType);
    
    /**
     * Get all datasources for an organization
     * @param organizationId the organization ID
     * @return list of datasource response DTOs
     */
    List<EnterpriseDatasourceResponseDto> getAllDatasourcesByOrganizationId(String organizationId);
    
    /**
     * Get all datasources
     * @return list of all datasource response DTOs
     */
    List<EnterpriseDatasourceResponseDto> getAllDatasources();
    
    /**
     * Update datasource
     * @param id the datasource ID
     * @param updateDto the update DTO
     * @return the updated datasource response DTO
     */
    EnterpriseDatasourceResponseDto updateDatasource(UUID id, EnterpriseDatasourceUpdateDto updateDto);
    
    /**
     * Delete datasource
     * @param id the datasource ID
     */
    void deleteDatasource(UUID id);
    
    /**
     * Check if datasource exists for an organization
     * @param organizationId the organization ID
     * @return true if datasource exists, false otherwise
     */
    boolean datasourceExistsForOrganization(String organizationId);

    boolean datasourceExistsForOrganizationAndType(String organizationId, String dbType);
}
