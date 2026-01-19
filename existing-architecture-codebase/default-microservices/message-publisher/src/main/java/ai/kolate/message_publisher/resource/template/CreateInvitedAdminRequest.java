package ai.kolate.message_publisher.resource.template;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateInvitedAdminRequest {
    @JsonProperty("organization_id")
    private String organizationId;
    @JsonProperty("admin_email")
    private String adminEmail;
}
