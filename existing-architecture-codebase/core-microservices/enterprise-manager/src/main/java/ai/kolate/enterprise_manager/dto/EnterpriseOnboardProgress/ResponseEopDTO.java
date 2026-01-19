package ai.kolate.enterprise_manager.dto.EnterpriseOnboardProgress;

import jakarta.persistence.Column;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ResponseEopDTO {

    private Boolean profileUpdated;
    private Boolean invitedMember;
    private Boolean createdProject;

}
