package ai.kolate.enterprise_manager.service;

import ai.kolate.enterprise_manager.dto.ssoticket.SsoTicketResponseDto;

import java.util.List;
import java.util.UUID;

public interface SsoTicketService {
    
    /**
     * Get SSO ticket by ID
     * @param id The SSO ticket ID
     * @return The SsoTicketResponseDto
     */
    SsoTicketResponseDto getSsoTicketById(UUID id);
    
    /**
     * Get SSO tickets by enterprise ID
     * @param enterpriseId The enterprise ID
     * @return List of SsoTicketResponseDto
     */
    List<SsoTicketResponseDto> getSsoTicketsByEnterpriseId(UUID enterpriseId);
    
    /**
     * Get SSO tickets by organization ID
     * @param organizationId The organization ID
     * @return List of SsoTicketResponseDto
     */
    List<SsoTicketResponseDto> getSsoTicketsByOrganizationId(String organizationId);
    
    /**
     * Get SSO ticket by admin email
     * @param adminEmail The admin email
     * @return The SsoTicketResponseDto
     */
    SsoTicketResponseDto getSsoTicketByAdminEmail(String adminEmail);
    
    /**
     * Delete SSO ticket by ID
     * @param id The SSO ticket ID
     */
    void deleteSsoTicket(UUID id);
    
    /**
     * Delete expired SSO tickets
     * @param expirationHours The number of hours after which tickets are considered expired
     * @return The number of deleted tickets
     */
    int deleteExpiredSsoTickets(int expirationHours);
}
