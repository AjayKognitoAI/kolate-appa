package ai.kolate.auth_manager.service;

import ai.kolate.auth_manager.config.ValueConfig;
import ai.kolate.auth_manager.dto.OrganizationRequestDTO;
import ai.kolate.auth_manager.dto.OrganizationResponseDTO;
import ai.kolate.auth_manager.dto.OrganizationConnectionDTO;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.List;
import java.util.Map;

@Service
public class Auth0OrganizationService {
    private static final Logger logger = LoggerFactory.getLogger(Auth0OrganizationService.class);

    private final WebClient webClient;
    private final TokenService tokenService;
    private final ObjectMapper objectMapper;
    private final ValueConfig valueConfig;

    public Auth0OrganizationService(
            WebClient webClient,
            TokenService tokenService,
            ObjectMapper objectMapper,
            ValueConfig valueConfig) {
        this.webClient = webClient;
        this.tokenService = tokenService;
        this.objectMapper = objectMapper;
        this.valueConfig = valueConfig;
    }

    /**
     * Create a new organization in Auth0
     * 
     * @param requestDTO The request data for creating the organization
     * @return OrganizationResponseDTO with the created organization details
     */
    public OrganizationResponseDTO createOrganization(OrganizationRequestDTO requestDTO) {
        String accessToken = tokenService.getAccessToken();
        String domain = valueConfig.getAuth0Domain();

        try {
            // Convert to Auth0 request format
            Map<String, Object> auth0Request = requestDTO.toAuth0Request();
            String requestBody = objectMapper.writeValueAsString(auth0Request);
            
            logger.debug("Creating organization with name: {}", requestDTO.getDisplayName());
            
            String responseJson = webClient
                    .post()
                    .uri("https://" + domain + "/api/v2/organizations")
                    .headers(headers -> {
                        headers.setBearerAuth(accessToken);
                        headers.setContentType(MediaType.APPLICATION_JSON);
                    })
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
            
            // Parse and return the response
            return objectMapper.readValue(responseJson, OrganizationResponseDTO.class);
            
        } catch (WebClientResponseException e) {
            logger.error("Error creating organization: status={}, body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Failed to create organization: " + e.getMessage(), e);
        } catch (JsonProcessingException e) {
            logger.error("Error processing JSON for organization creation", e);
            throw new RuntimeException("Error processing organization data", e);
        }
    }

    /**
     * Delete a connection from an organization in Auth0
     * 
     * @param organizationId The organization ID
     * @return true if deletion was successful, false otherwise
     */
    public boolean deleteOrganizationConnection(String organizationId) {
        String accessToken = tokenService.getAccessToken();
        String domain = valueConfig.getAuth0Domain();
        String connectionId = getOrganizationConnections(organizationId).get(0).getConnectionId();

        try {
            logger.debug("Deleting connection {} from organization: {}", connectionId, organizationId);
            
            webClient
                    .delete()
                    .uri("https://" + domain + "/api/v2/organizations/{id}/enabled_connections/{connectionId}", 
                         organizationId, connectionId)
                    .headers(headers -> {
                        headers.setBearerAuth(accessToken);
                        headers.setContentType(MediaType.APPLICATION_JSON);
                    })
                    .retrieve()
                    .bodyToMono(Void.class)
                    .block();
            
            logger.info("Successfully deleted connection {} from organization {}", connectionId, organizationId);
            return true;
            
        } catch (WebClientResponseException e) {
            logger.error("Error deleting organization connection: status={}, body={}", 
                        e.getStatusCode(), e.getResponseBodyAsString());
            
            // If the connection doesn't exist (404), we can consider it as already deleted
            if (e.getStatusCode().value() == 404) {
                logger.info("Connection {} not found in organization {} - may already be deleted", 
                           connectionId, organizationId);
                return true;
            }
            
            throw new RuntimeException("Failed to delete organization connection: " + e.getMessage(), e);
        } catch (Exception e) {
            logger.error("Unexpected error deleting organization connection", e);
            throw new RuntimeException("Error deleting organization connection", e);
        }
    }

    /**
     * Get all active connections of an organization from Auth0
     * 
     * @param organizationId The organization ID
     * @return List of OrganizationConnectionDTO with the organization's enabled connections
     */
    public List<OrganizationConnectionDTO> getOrganizationConnections(String organizationId) {
        String accessToken = tokenService.getAccessToken();
        String domain = valueConfig.getAuth0Domain();
        
        try {
            logger.debug("Getting connections for organization: {}", organizationId);
            
            String responseJson = webClient
                    .get()
                    .uri("https://" + domain + "/api/v2/organizations/{id}/enabled_connections", organizationId)
                    .headers(headers -> {
                        headers.setBearerAuth(accessToken);
                        headers.setContentType(MediaType.APPLICATION_JSON);
                    })
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
            
            // Parse the JSON response into a list of OrganizationConnectionDTO
            TypeReference<List<OrganizationConnectionDTO>> typeRef = new TypeReference<List<OrganizationConnectionDTO>>() {};
            List<OrganizationConnectionDTO> connections = objectMapper.readValue(responseJson, typeRef);
            
            logger.debug("Retrieved {} connections for organization {}", connections.size(), organizationId);
            return connections;
            
        } catch (WebClientResponseException e) {
            logger.error("Error getting organization connections: status={}, body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Failed to get organization connections: " + e.getMessage(), e);
        } catch (JsonProcessingException e) {
            logger.error("Error processing JSON for organization connections", e);
            throw new RuntimeException("Error processing organization connections data", e);
        }
    }
}
