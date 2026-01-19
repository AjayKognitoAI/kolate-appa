package ai.kolate.auth_manager.service;

import ai.kolate.auth_manager.config.ValueConfig;
import ai.kolate.auth_manager.dto.SSOTicketRequestDTO;
import ai.kolate.auth_manager.dto.SSOTicketResponseDTO;
import ai.kolate.auth_manager.util.SSOTicketRequestMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class Auth0SelfSsoService {
    private static final Logger logger = LoggerFactory.getLogger(Auth0SelfSsoService.class);

    private final WebClient webClient;
    private final TokenService tokenService;
    private final ObjectMapper objectMapper;
    private final ValueConfig valueConfig;
    private final SSOTicketRequestMapper ssoTicketRequestMapper;

    /**
     * Create an SSO access ticket to initiate the Self Service SSO Flow
     * 
     * @param profileId The ID of the self-service profile
     * @param requestDTO The request containing connection configuration data
     * @return SSOTicketResponseDTO containing the access ticket
     */
    public SSOTicketResponseDTO createSSOTicket(String profileId, SSOTicketRequestDTO requestDTO) {
        String accessToken = tokenService.getAccessToken();
        String domain = valueConfig.getAuth0Domain();

        try {
            // If profileId is not provided, use the default from the configuration
            if (profileId == null || profileId.isBlank()) {
                profileId = valueConfig.getAuth0SspId();
            }

            // Convert to Auth0 request format
            SSOTicketRequestDTO.Auth0SSOTicketRequest auth0Request = ssoTicketRequestMapper.toAuth0Request(requestDTO);
            auth0Request.setEnabledClients(List.of(valueConfig.getAuth0AppClientId()));
            String requestBody = objectMapper.writeValueAsString(auth0Request);
            
            logger.debug("Creating SSO ticket for self-service profile: {}", profileId);
            
            String responseJson = webClient
                    .post()
                    .uri("https://" + domain + "/api/v2/self-service-profiles/" + profileId + "/sso-ticket")
                    .headers(headers -> {
                        headers.setBearerAuth(accessToken);
                        headers.setContentType(MediaType.APPLICATION_JSON);
                    })
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
            
            // Parse the response
            Map<String, String> responseMap = objectMapper.readValue(responseJson, Map.class);
            
            return SSOTicketResponseDTO.builder()
                    .ticket(responseMap.get("ticket"))
                    .build();
            
        } catch (WebClientResponseException e) {
            logger.error("Error creating SSO ticket: status={}, body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Failed to create SSO ticket: " + e.getMessage(), e);
        } catch (JsonProcessingException e) {
            logger.error("Error processing JSON for SSO ticket", e);
            throw new RuntimeException("Error processing SSO ticket data", e);
        }
    }
}
