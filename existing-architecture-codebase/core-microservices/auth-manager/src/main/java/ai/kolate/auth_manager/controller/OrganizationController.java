package ai.kolate.auth_manager.controller;

import ai.kolate.auth_manager.dto.OrganizationRequestDTO;
import ai.kolate.auth_manager.dto.OrganizationResponseDTO;
import ai.kolate.auth_manager.dto.OrganizationConnectionDTO;
import ai.kolate.auth_manager.service.Auth0OrganizationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/auth-manager")
public class OrganizationController {
    private static final Logger logger = LoggerFactory.getLogger(OrganizationController.class);
    
    private final Auth0OrganizationService organizationService;
    
    public OrganizationController(Auth0OrganizationService organizationService) {
        this.organizationService = organizationService;
    }
    
    /**
     * Create a new organization in Auth0
     * 
     * @param requestDTO The organization request data containing name, display_name, and branding information
     * @return OrganizationResponseDTO containing the created organization details
     */
    @PostMapping("/v1/organizations")
    public ResponseEntity<OrganizationResponseDTO> createOrganization(@RequestBody @Valid OrganizationRequestDTO requestDTO) {
        logger.info("Creating new organization with name: {}", requestDTO.getDisplayName());
        
        try {
            OrganizationResponseDTO response = organizationService.createOrganization(requestDTO);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            logger.error("Failed to create organization", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get organization connections from Auth0
     * 
     * @param organizationId The organization ID to get connections for
     * @return List of OrganizationConnectionDTO containing the organization's enabled connections
     */
    @GetMapping("/v1/organization/{organization_id}/connections")
    public ResponseEntity<List<OrganizationConnectionDTO>> getOrganizationConnections(@PathVariable("organization_id") String organizationId) {
        logger.info("Getting connections for organization: {}", organizationId);
        
        try {
            List<OrganizationConnectionDTO> connections = organizationService.getOrganizationConnections(organizationId);
            return ResponseEntity.ok(connections);
        } catch (Exception e) {
            logger.error("Failed to get organization connections for organization: {}", organizationId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Delete organization connection from Auth0
     * 
     * @param organizationId The organization ID to delete connection from
     * @return Success message or error response
     */
    @DeleteMapping("/v1/organization/{organization_id}/connection")
    public ResponseEntity<String> deleteOrganizationConnection(@PathVariable("organization_id") String organizationId) {
        logger.info("Deleting connection for organization: {}", organizationId);
        
        try {
            boolean success = organizationService.deleteOrganizationConnection(organizationId);
            if (success) {
                return ResponseEntity.ok("Organization connection deleted successfully");
            } else {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to delete organization connection");
            }
        } catch (Exception e) {
            logger.error("Failed to delete organization connection for organization: {}", organizationId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error deleting organization connection: " + e.getMessage());
        }
    }
}
