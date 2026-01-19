package ai.kolate.auth_manager.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class UserRoleDTO {

    private String id;

    private String name;

    private String description;

    @JsonProperty("application_type")
    private String applicationType;

    @JsonProperty("application_id")
    private String applicationId;
}
