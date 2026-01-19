package ai.kolate.enterprise_manager.dto.enterprise;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeleteEnterpriseRequestDto {
    private String deleteReason;
}
