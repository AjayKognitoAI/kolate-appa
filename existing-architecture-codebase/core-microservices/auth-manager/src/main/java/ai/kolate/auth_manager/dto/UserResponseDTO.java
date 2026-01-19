package ai.kolate.auth_manager.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

/**
 * DTO representing a user response from Auth0 Management API
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class UserResponseDTO {

    @JsonProperty("user_id")
    private String userId;

    private String email;

    private String picture;

    private String name;

    @JsonProperty("given_name")
    private String givenName;

    @JsonProperty("family_name")
    private String familyName;

    private String nickname;

    @JsonProperty("email_verified")
    private Boolean emailVerified;

    @JsonProperty("created_at")
    private String createdAt;

    @JsonProperty("updated_at")
    private String updatedAt;

    @JsonProperty("last_login")
    private String lastLogin;

    @JsonProperty("login_count")
    private Integer loginCount;

    // Roles are included when using fields=roles parameter
    private List<UserRoleDTO> roles;

    // Additional metadata can be included
    @JsonProperty("user_metadata")
    private Object userMetadata;

    @JsonProperty("app_metadata")
    private Object appMetadata;
}
