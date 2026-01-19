package ai.kolate.enterprise_manager.controller;

import ai.kolate.enterprise_manager.dto.GlobalResponse;
import ai.kolate.enterprise_manager.dto.ssoticket.SsoTicketResponseDto;
import ai.kolate.enterprise_manager.service.SsoTicketService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/enterprise-manager")
@RequiredArgsConstructor
public class SsoTicketController {

    private final SsoTicketService ssoTicketService;

    /**
     * Get SSO ticket by ID
     * @param id The SSO ticket ID
     * @return A response entity with the SSO ticket details
     */
    @GetMapping("/v1/sso-tickets/{id}")
    public ResponseEntity<GlobalResponse> getSsoTicketById(@PathVariable UUID id) {
        SsoTicketResponseDto responseDto = ssoTicketService.getSsoTicketById(id);
        return ResponseEntity.ok(GlobalResponse.builder()
                .state("success")
                .status(HttpStatus.OK.toString())
                .message("SSO ticket retrieved successfully")
                .data(responseDto)
                .build());
    }

    /**
     * Get SSO tickets by enterprise ID
     * @param enterpriseId The enterprise ID
     * @return A response entity with the list of SSO tickets
     */
    @GetMapping("/v1/sso-tickets/enterprise/{enterpriseId}")
    public ResponseEntity<GlobalResponse> getSsoTicketsByEnterpriseId(@PathVariable UUID enterpriseId) {
        List<SsoTicketResponseDto> responseDtos = ssoTicketService.getSsoTicketsByEnterpriseId(enterpriseId);
        return ResponseEntity.ok(GlobalResponse.builder()
                .state("success")
                .status(HttpStatus.OK.toString())
                .message("SSO tickets retrieved successfully")
                .data(responseDtos)
                .build());
    }

    /**
     * Get SSO tickets by organization ID
     * @param organizationId The organization ID
     * @return A response entity with the list of SSO tickets
     */
    @GetMapping("/v1/sso-tickets/organization/{organizationId}")
    public ResponseEntity<GlobalResponse> getSsoTicketsByOrganizationId(@PathVariable String organizationId) {
        List<SsoTicketResponseDto> responseDtos = ssoTicketService.getSsoTicketsByOrganizationId(organizationId);
        return ResponseEntity.ok(GlobalResponse.builder()
                .state("success")
                .status(HttpStatus.OK.toString())
                .message("SSO tickets retrieved successfully")
                .data(responseDtos)
                .build());
    }

    /**
     * Get SSO ticket by admin email
     * @param adminEmail The admin email
     * @return A response entity with the SSO ticket details
     */
    @GetMapping("/v1/sso-tickets/admin/{adminEmail}")
    public ResponseEntity<GlobalResponse> getSsoTicketByAdminEmail(@PathVariable String adminEmail) {
        SsoTicketResponseDto responseDto = ssoTicketService.getSsoTicketByAdminEmail(adminEmail);
        return ResponseEntity.ok(GlobalResponse.builder()
                .state("success")
                .status(HttpStatus.OK.toString())
                .message("SSO ticket retrieved successfully")
                .data(responseDto)
                .build());
    }

    /**
     * Delete SSO ticket by ID
     * @param id The SSO ticket ID
     * @return A response entity with the deletion status
     */
    @DeleteMapping("/v1/sso-tickets/{id}")
    public ResponseEntity<GlobalResponse> deleteSsoTicket(@PathVariable UUID id) {
        ssoTicketService.deleteSsoTicket(id);
        return ResponseEntity.ok(GlobalResponse.builder()
                .state("success")
                .status(HttpStatus.OK.toString())
                .message("SSO ticket deleted successfully")
                .data(null)
                .build());
    }

    /**
     * Delete expired SSO tickets
     * @param expirationHours The number of hours after which tickets are considered expired
     * @return A response entity with the number of deleted tickets
     */
    @DeleteMapping("/v1/sso-tickets/expired")
    public ResponseEntity<GlobalResponse> deleteExpiredSsoTickets(
            @RequestParam(defaultValue = "24") int expirationHours) {
        int deletedCount = ssoTicketService.deleteExpiredSsoTickets(expirationHours);
        return ResponseEntity.ok(GlobalResponse.builder()
                .state("success")
                .status(HttpStatus.OK.toString())
                .message("Expired SSO tickets deleted successfully")
                .data(deletedCount)
                .build());
    }
}
