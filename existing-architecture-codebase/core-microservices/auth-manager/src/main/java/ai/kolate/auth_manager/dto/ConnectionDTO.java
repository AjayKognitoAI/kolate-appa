package ai.kolate.auth_manager.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO representing a connection within an organization's enabled connections
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ConnectionDTO {
    
    @JsonProperty("name")
    private String name;
    
    @JsonProperty("strategy")
    private String strategy;

}
