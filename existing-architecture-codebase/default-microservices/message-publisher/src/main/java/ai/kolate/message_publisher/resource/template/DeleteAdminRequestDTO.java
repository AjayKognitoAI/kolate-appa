package ai.kolate.message_publisher.resource.template;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeleteAdminRequestDTO {
    private String adminEmail;
}
