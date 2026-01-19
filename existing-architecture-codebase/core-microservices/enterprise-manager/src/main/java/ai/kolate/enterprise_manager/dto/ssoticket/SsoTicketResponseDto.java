package ai.kolate.enterprise_manager.dto.ssoticket;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SsoTicketResponseDto {
    private UUID id;
    private UUID enterpriseId;
    private String organizationId;
    private String adminEmail;
    private String ticketUrl;
    private LocalDateTime createdAt;
}
