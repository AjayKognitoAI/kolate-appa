package ai.kolate.enterprise_manager.dto.EnterpriseModuleAccess;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnterpriseModuleAccessResultDTO {

    private List<EnterpriseModuleAccessDTO> granted;
    private List<EnterpriseModuleAccessDTO> revoked;
    private List<AccessErrorDTO> errors;

}
