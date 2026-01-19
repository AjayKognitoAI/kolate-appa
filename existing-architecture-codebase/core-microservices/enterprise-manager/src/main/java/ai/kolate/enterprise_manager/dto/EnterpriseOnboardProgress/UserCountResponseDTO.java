package ai.kolate.enterprise_manager.dto.EnterpriseOnboardProgress;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class UserCountResponseDTO {
    @JsonProperty("data")
    private Long usersCount;
}
