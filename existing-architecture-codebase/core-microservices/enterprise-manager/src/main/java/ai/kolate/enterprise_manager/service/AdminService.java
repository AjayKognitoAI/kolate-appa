package ai.kolate.enterprise_manager.service;

import ai.kolate.enterprise_manager.dto.admin.AdminCreateDTO;
import ai.kolate.enterprise_manager.dto.admin.AdminDTO;
import ai.kolate.enterprise_manager.dto.admin.AdminUpdateDTO;
import ai.kolate.enterprise_manager.dto.listener.CreateInvitedAdminRequestDTO;
import ai.kolate.enterprise_manager.dto.listener.UpdateAdminRequestDTO;
import ai.kolate.enterprise_manager.model.enums.UserType;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AdminService {
    
    /**
     * Create a new admin
     * @param adminCreateDTO the admin creation data
     * @return the created admin DTO
     */
    AdminDTO createAdmin(AdminCreateDTO adminCreateDTO);
    
    /**
     * Update an existing admin
     * @param adminUpdateDTO the admin update data
     * @return the updated admin DTO
     */
    AdminDTO updateAdmin(AdminUpdateDTO adminUpdateDTO);
    
    /**
     * Get an admin by ID
     * @param id the admin ID
     * @return optional containing the admin DTO if found
     */
    Optional<AdminDTO> getAdminById(UUID id);
    
    /**
     * Get an admin by Auth0 ID
     * @param auth0Id the Auth0 ID
     * @return optional containing the admin DTO if found
     */
    Optional<AdminDTO> getAdminByAuth0Id(String auth0Id);
    
    /**
     * Get an admin by email
     * @param email the admin email
     * @return optional containing the admin DTO if found
     */
    Optional<AdminDTO> getAdminByEmail(String email);
    
    /**
     * Get all admins for an enterprise
     * @param enterpriseId the enterprise ID
     * @return list of admin DTOs
     */
    List<AdminDTO> getAdminsByEnterpriseId(UUID enterpriseId);
    
    /**
     * Get all admins for an organization
     * @param organizationId the organization ID
     * @return list of admin DTOs
     */
    List<AdminDTO> getAdminsByOrganizationId(String organizationId);
    
    /**
     * Get all admins by user type
     * @param userType the user type
     * @return list of admin DTOs
     */
    List<AdminDTO> getAdminsByUserType(UserType userType);
    
    /**
     * Get all admins by enterprise ID and user type
     * @param enterpriseId the enterprise ID
     * @param userType the user type
     * @return list of admin DTOs
     */
    List<AdminDTO> getAdminsByEnterpriseIdAndUserType(UUID enterpriseId, UserType userType);
    
    /**
     * Delete an admin by ID
     * @param id the admin ID
     * @return true if deleted successfully, false otherwise
     */
    boolean deleteAdminById(UUID id);
    boolean deleteAdminByEmail(String email);
    
    /**
     * Check if an admin exists by email and enterprise ID
     * @param email the admin email
     * @param enterpriseId the enterprise ID
     * @return true if exists, false otherwise
     */
    boolean existsByEmailAndEnterpriseId(String email, UUID enterpriseId);
    
    /**
     * Check if an admin exists by Auth0 ID
     * @param auth0Id the Auth0 ID
     * @return true if exists, false otherwise
     */
    boolean existsByAuth0Id(String auth0Id);

    AdminDTO createAdminByOrganizationId(CreateInvitedAdminRequestDTO request);
    AdminDTO updateAdminByEmail(UpdateAdminRequestDTO adminUpdateDTO);
}
