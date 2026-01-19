package ai.kolate.auth_manager.controller;

import ai.kolate.auth_manager.dto.SSOTicketRequestDTO;
import ai.kolate.auth_manager.dto.SSOTicketResponseDTO;
import ai.kolate.auth_manager.service.Auth0SelfSsoService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth-manager")
public class SsoSelfServiceController {
    private static final Logger logger = LoggerFactory.getLogger(SsoSelfServiceController.class);
    
    private final Auth0SelfSsoService selfServiceProfileService;
    
    public SsoSelfServiceController(Auth0SelfSsoService selfServiceProfileService) {
        this.selfServiceProfileService = selfServiceProfileService;
    }
    
    /**
     * Create an SSO access ticket to initiate the Self Service SSO Flow
     * 
     * @param profileId Optional profile ID (if not provided, the default from config will be used)
     * @param requestDTO The connection configuration for the SSO ticket
     * @return SSOTicketResponseDTO containing the access ticket
     */
    @PostMapping(value = {"/v1/self-service-profiles/{profileId}/sso-ticket", "/v1/self-service-profiles/sso-ticket"})
    public ResponseEntity<SSOTicketResponseDTO> createSSOTicket(
            @PathVariable(required = false) String profileId,
            @Valid @RequestBody SSOTicketRequestDTO requestDTO) {
        
        logger.info("Creating SSO ticket for self-service profile");
        
        try {
            SSOTicketResponseDTO response = selfServiceProfileService.createSSOTicket(profileId, requestDTO);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Failed to create SSO ticket", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
