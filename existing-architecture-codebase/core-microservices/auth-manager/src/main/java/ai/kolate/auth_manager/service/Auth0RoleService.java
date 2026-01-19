package ai.kolate.auth_manager.service;

import ai.kolate.auth_manager.config.ValueConfig;
import ai.kolate.auth_manager.dto.RoleResponseDTO;
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

@Service
public class Auth0RoleService {
    private static final Logger logger = LoggerFactory.getLogger(Auth0RoleService.class);

    private final WebClient webClient;
    private final TokenService tokenService;
    private final ObjectMapper objectMapper;
    private final ValueConfig valueConfig;

    public Auth0RoleService(
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
     * Get all roles from Auth0
     *
     * @return List of RoleResponseDTO containing all roles
     */
    public List<RoleResponseDTO> getRoles() {
        String accessToken = tokenService.getAccessToken();
        String domain = valueConfig.getAuth0Domain();

        try {
            logger.debug("Fetching roles from Auth0");

            String responseJson = webClient
                    .get()
                    .uri("https://" + domain + "/api/v2/roles")
                    .headers(headers -> {
                        headers.setBearerAuth(accessToken);
                        headers.setContentType(MediaType.APPLICATION_JSON);
                    })
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            // Parse the JSON response into a list of RoleResponseDTO
            TypeReference<List<RoleResponseDTO>> typeRef = new TypeReference<List<RoleResponseDTO>>() {
            };
            List<RoleResponseDTO> roles = objectMapper.readValue(responseJson, typeRef);

            logger.debug("Retrieved {} roles from Auth0", roles.size());
            return roles;

        } catch (WebClientResponseException e) {
            logger.error("Error fetching roles: status={}, body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Failed to fetch roles: " + e.getMessage(), e);
        } catch (JsonProcessingException e) {
            logger.error("Error processing JSON for roles", e);
            throw new RuntimeException("Error processing roles data", e);
        }
    }
}
