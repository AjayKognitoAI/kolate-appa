package ai.kolate.enterprise_manager.service;

import ai.kolate.enterprise_manager.dto.PagedResponse;
import ai.kolate.enterprise_manager.dto.enterprise.DeleteEnterpriseRequestDto;
import ai.kolate.enterprise_manager.dto.enterprise.EnterpriseRequestDto;
import ai.kolate.enterprise_manager.dto.enterprise.EnterpriseResponseDto;
import ai.kolate.enterprise_manager.dto.enterprise.EnterpriseStatsDto;
import ai.kolate.enterprise_manager.dto.enterprise.EnterpriseUpdateDto;
import ai.kolate.enterprise_manager.dto.project.ProjectStatsResponse;
import ai.kolate.enterprise_manager.dto.project.ProjectSummaryResponse;
import ai.kolate.enterprise_manager.model.enums.EnterpriseStatus;
import org.springframework.data.domain.Page;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

public interface EnterpriseService {
    /**
     * Create a new enterprise
     * @param requestDto the enterprise request DTO
     * @return the created enterprise response DTO
     */
    EnterpriseResponseDto createEnterprise(EnterpriseRequestDto requestDto);
    
    /**
     * Get enterprise by ID
     * @param id the enterprise ID
     * @return the enterprise response DTO
     */
    EnterpriseResponseDto getEnterpriseById(UUID id);
    
    /**
     * Get enterprise by organization ID
     * @param organizationId the organization ID
     * @return the enterprise response DTO
     */
    EnterpriseResponseDto getEnterpriseByOrganizationId(String organizationId);
    
    /**
     * Get enterprise by domain
     * @param domain the domain
     * @return the enterprise response DTO
     */
    EnterpriseResponseDto getEnterpriseByDomain(String domain);
    
    /**
     * Get enterprise by admin email
     * @param adminEmail the admin email
     * @return the enterprise response DTO
     */
    EnterpriseResponseDto getEnterpriseByAdminEmail(String adminEmail);
    
    /**
     * Get all enterprises
     * @return list of enterprise response DTOs
     */
    List<EnterpriseResponseDto> getAllEnterprises();
    
    /**
     * Get all enterprises with pagination
     * @param page The page number (0-based)
     * @param size The page size
     * @param sort The sort field
     * @param direction The sort direction ('asc' or 'desc')
     * @return Page of enterprise response DTOs
     */
    Page<EnterpriseResponseDto> getAllEnterprisesPaginated(int page, int size, String sort, String direction);
    
    /**
     * Get enterprises by status
     * @param status the enterprise status
     * @return list of enterprise response DTOs
     */
    List<EnterpriseResponseDto> getEnterprisesByStatus(EnterpriseStatus status);
    
    /**
     * Get enterprises by status with pagination
     * @param status the enterprise status
     * @param page The page number (0-based)
     * @param size The page size
     * @param sort The sort field
     * @param direction The sort direction ('asc' or 'desc')
     * @return Page of enterprise response DTOs with the specified status
     */
    Page<EnterpriseResponseDto> getEnterprisesByStatusPaginated(EnterpriseStatus status, int page, int size, String sort, String direction);
    
    /**
     * Search enterprises by name or description
     * @param keyword the search keyword
     * @return list of enterprise response DTOs
     */
    List<EnterpriseResponseDto> searchEnterprises(String keyword);
    
    /**
     * Search enterprises by name or description with pagination
     * @param keyword the search keyword
     * @param page The page number (0-based)
     * @param size The page size
     * @param sort The sort field
     * @param direction The sort direction ('asc' or 'desc')
     * @return Page of enterprise response DTOs matching the search criteria
     */
    Page<EnterpriseResponseDto> searchEnterprisesPaginated(String keyword, int page, int size, String sort, String direction);
    
    /**
     * Update enterprise
     * @param id the enterprise ID
     * @param updateDto the update DTO
     * @return the updated enterprise response DTO
     */
    EnterpriseResponseDto updateEnterprise(UUID id, EnterpriseUpdateDto updateDto);

    @Transactional
    EnterpriseResponseDto updateEnterpriseWithOrganizationId(String organizationId, EnterpriseUpdateDto updateDto);

    /**
     * Update enterprise status
     * @param id the enterprise ID
     * @param status the new status
     * @return the updated enterprise response DTO
     */
    EnterpriseResponseDto updateEnterpriseStatus(UUID id, EnterpriseStatus status);
    
    /**
     * Delete enterprise
     * @param id the enterprise ID
     */
    void deleteEnterprise(UUID id);

    void softDeleteEnterprise(UUID id);

    void requestDeleteEnterprise(String adminId, String organizationId, DeleteEnterpriseRequestDto requestDto);
    
    /**
     * Check if domain exists
     * @param domain the domain to check
     * @return true if domain exists, false otherwise
     */
    boolean domainExists(String domain);
    
    /**
     * Check if organization ID exists
     * @param organizationId the organization ID to check
     * @return true if organization ID exists, false otherwise
     */
    boolean organizationIdExists(String organizationId);

    EnterpriseStatsDto getEnterpriseStats();

    PagedResponse<ProjectSummaryResponse> getAllProjects(int page, int size, String sortBy, String sortDirection,String orgId);

    ProjectStatsResponse getEnterpriseProjectStats(String orgId);
}
