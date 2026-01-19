package ai.kolate.enterprise_manager.dto.trial;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrialResponseDTO {
    private List<TrialDTO> trials;
    private String message;
    private boolean success;
}
