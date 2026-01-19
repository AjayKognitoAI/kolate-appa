package ai.kolate.enterprise_manager.dto.listener;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeleteAdminRequestDTO {
    private String adminEmail;
}
