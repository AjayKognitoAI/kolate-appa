package ai.kolate.auth_manager.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO representing an organization's enabled connection
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class OrganizationConnectionDTO {
    
    @JsonProperty("connection_id")
    private String connectionId;
    
    @JsonProperty("assign_membership_on_login")
    private Boolean assignMembershipOnLogin;
    
    @JsonProperty("show_as_button")
    private Boolean showAsButton;
    
    @JsonProperty("connection")
    private ConnectionDTO connection;

}
