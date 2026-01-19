package ai.kolate.auth_manager.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Auth0BlockUnblockUserRequestDTO {
    @JsonProperty("auth0_id")
    private String auth0Id;
}
