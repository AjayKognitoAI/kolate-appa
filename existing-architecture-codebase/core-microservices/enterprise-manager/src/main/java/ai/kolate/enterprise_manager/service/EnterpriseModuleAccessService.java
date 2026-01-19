package ai.kolate.enterprise_manager.service;


import ai.kolate.enterprise_manager.dto.EnterpriseModuleAccess.*;

import java.util.List;
import java.util.SequencedCollection;
import java.util.UUID;

/**
 * Service interface for managing enterprise module access
 */
public interface EnterpriseModuleAccessService {

    /**
     * Manage enterprise access by granting and revoking access to modules/trials
     * @param requestDTO The request containing grant and revoke access lists
     * @return Result containing granted, revoked access and any errors
     */
    EnterpriseModuleAccessResultDTO manageEnterpriseAccess(EnterpriseModuleAccessRequestDTO requestDTO);

    /**
     * Get all access records for a specific organization
     *
     * @param organizationId The organization ID
     * @return List of access records
     */
    List<ModuleDTO> getAccessByOrganizationId(String organizationId);


     /**
     * Get all access records with modules and trials for a specific enterprise access level
     *
     * @param enterpriseId The enterprise ID
     * @return List of access records
     */
    List<ModuleDTO> getAllModulesAndTrialsByEnterprise(UUID enterpriseId);

}

