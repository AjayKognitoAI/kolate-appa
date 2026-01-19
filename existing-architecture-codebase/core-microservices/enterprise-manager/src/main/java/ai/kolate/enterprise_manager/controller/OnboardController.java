package ai.kolate.enterprise_manager.controller;

import ai.kolate.enterprise_manager.dto.GlobalResponse;
import ai.kolate.enterprise_manager.dto.onboard.EnterpriseInviteRequest;
import ai.kolate.enterprise_manager.dto.onboard.EnterpriseInviteResponse;
import ai.kolate.enterprise_manager.dto.onboard.EnterpriseReInviteRequest;
import ai.kolate.enterprise_manager.dto.onboard.OnboardRequest;
import ai.kolate.enterprise_manager.dto.onboard.OnboardResponse;
import ai.kolate.enterprise_manager.dto.onboard.OrganizationConnectionEventDto;
import ai.kolate.enterprise_manager.service.OnboardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@Slf4j
public class OnboardController {

    private final OnboardService onboardService;

    /**
     * Endpoint to invite a new enterprise to the platform.
     * Creates records in the enterprise and admin tables and sends an invitation notification.
     *
     * @param request The enterprise invitation details
     * @return Response entity with invitation details
     */
    @PostMapping("/api/enterprise-manager/v1/organization/invite")
    public ResponseEntity<GlobalResponse> inviteEnterprise(
            @Valid @RequestBody EnterpriseInviteRequest request) {
        log.info("Received enterprise invitation request for: {}", request.getEnterpriseName());
        
        try {
            EnterpriseInviteResponse response = onboardService.inviteEnterprise(request);
            
            GlobalResponse globalResponse = GlobalResponse.builder()
                    .state("SUCCESS")
                    .status(HttpStatus.CREATED.toString())
                    .data(response)
                    .build();
                    
            return new ResponseEntity<>(globalResponse, HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            log.warn("Invalid enterprise invitation request: {}", e.getMessage());
            
            GlobalResponse errorResponse = GlobalResponse.builder()
                    .state("ERROR")
                    .status(HttpStatus.BAD_REQUEST.toString())
                    .message(e.getMessage())
                    .build();
                    
            return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            log.error("Error processing enterprise invitation", e);
            
            GlobalResponse errorResponse = GlobalResponse.builder()
                    .state("ERROR")
                    .status(HttpStatus.INTERNAL_SERVER_ERROR.toString())
                    .message("Error processing enterprise invitation")
                    .build();
                    
            return new ResponseEntity<>(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    /**
     * Endpoint to re-invite an existing enterprise to the platform.
     * Verifies the enterprise exists and resends the invitation notification.
     *
     * @param request The enterprise re-invitation request containing the enterprise ID
     * @return Response entity with invitation details
     */
    @PostMapping("/api/enterprise-manager/v1/organization/re-invite")
    public ResponseEntity<GlobalResponse> reInviteEnterprise(
            @Valid @RequestBody EnterpriseReInviteRequest request) {
        log.info("Received enterprise re-invitation request for ID: {}", request.getEnterpriseId());
        
        try {
            EnterpriseInviteResponse response = onboardService.reInviteEnterprise(request);
            
            GlobalResponse globalResponse = GlobalResponse.builder()
                    .state("SUCCESS")
                    .status(HttpStatus.OK.toString())
                    .data(response)
                    .build();
                    
            return new ResponseEntity<>(globalResponse, HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            log.warn("Invalid enterprise re-invitation request: {}", e.getMessage());
            
            GlobalResponse errorResponse = GlobalResponse.builder()
                    .state("ERROR")
                    .status(HttpStatus.BAD_REQUEST.toString())
                    .message(e.getMessage())
                    .build();
                    
            return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
        } catch (IllegalStateException e) {
            log.warn("Failed to send re-invitation: {}", e.getMessage());
            
            GlobalResponse errorResponse = GlobalResponse.builder()
                    .state("ERROR")
                    .status(HttpStatus.INTERNAL_SERVER_ERROR.toString())
                    .message(e.getMessage())
                    .build();
                    
            return new ResponseEntity<>(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
        } catch (Exception e) {
            log.error("Error processing enterprise re-invitation", e);
            
            GlobalResponse errorResponse = GlobalResponse.builder()
                    .state("ERROR")
                    .status(HttpStatus.INTERNAL_SERVER_ERROR.toString())
                    .message("Error processing enterprise re-invitation")
                    .build();
                    
            return new ResponseEntity<>(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Endpoint to onboard an enterprise by creating an Auth0 organization and generating an SSO ticket.
     * External endpoint meant to be called by the onboarding flow after the admin accepts the invitation.
     *
     * @param request The onboarding request with enterprise ID and configuration details
     * @return Response entity with organization and SSO ticket details
     */
    @PostMapping("/external/enterprise-manager/v1/organization/onboard")
    public ResponseEntity<GlobalResponse> createOrganizationAndGenerateSSOTicket(
            @Valid @RequestBody OnboardRequest request) {
        log.info("Received onboarding request for enterprise ID: {}", request.getEnterpriseId());
        
        try {
            OnboardResponse response = onboardService.onboardEnterprise(request);
            
            GlobalResponse globalResponse = GlobalResponse.builder()
                    .state("SUCCESS")
                    .status(HttpStatus.CREATED.toString())
                    .data(response)
                    .build();
                    
            return new ResponseEntity<>(globalResponse, HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            log.warn("Invalid onboarding request: {}", e.getMessage());
            
            GlobalResponse errorResponse = GlobalResponse.builder()
                    .state("ERROR")
                    .status(HttpStatus.BAD_REQUEST.toString())
                    .message(e.getMessage())
                    .build();
                    
            return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
        } catch (IllegalStateException e) {
            log.warn("Invalid enterprise state for onboarding: {}", e.getMessage());
            
            GlobalResponse errorResponse = GlobalResponse.builder()
                    .state("ERROR")
                    .status(HttpStatus.CONFLICT.toString())
                    .message(e.getMessage())
                    .build();
                    
            return new ResponseEntity<>(errorResponse, HttpStatus.CONFLICT);
        } catch (Exception e) {
            log.error("Error processing onboarding request", e);
            
            GlobalResponse errorResponse = GlobalResponse.builder()
                    .state("ERROR")
                    .status(HttpStatus.INTERNAL_SERVER_ERROR.toString())
                    .message("Error processing onboarding request")
                    .build();
                    
            return new ResponseEntity<>(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PostMapping("/external/enterprise-manager/v1/organization/connection/hook")
    public ResponseEntity<Void> connectionEventStreamHook(@RequestBody OrganizationConnectionEventDto data) {
        log.info("Auth0 event stream data :: {}", data);
        try {
            onboardService.notifyInfraProvisioner(data);
            return new ResponseEntity<>(HttpStatus.OK);
        } catch (Exception e) {
            log.error("Error while notifying infra provisioner :: {}", e.getMessage());
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Global exception handler for this controller.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<GlobalResponse> handleException(Exception e) {
        log.error("Unhandled exception in OnboardController", e);
        
        GlobalResponse errorResponse = GlobalResponse.builder()
                .state("ERROR")
                .status(HttpStatus.INTERNAL_SERVER_ERROR.toString())
                .message("An unexpected error occurred")
                .build();
                
        return new ResponseEntity<>(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
