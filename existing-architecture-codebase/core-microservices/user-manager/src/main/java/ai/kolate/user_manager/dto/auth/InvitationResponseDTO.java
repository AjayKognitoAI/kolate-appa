package ai.kolate.user_manager.dto.auth;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class InvitationResponseDTO {

    private String id;

    @JsonProperty("client_id")
    private String clientId;

    private Inviter inviter;

    private Invitee invitee;

    @JsonProperty("app_metadata")
    private Map<String, Object> appMetadata;

    @JsonProperty("user_metadata")
    private Map<String, Object> userMetadata;

    @JsonProperty("invitation_url")
    private String invitationUrl;

    @JsonProperty("ticket_id")
    private String ticketId;

    @JsonProperty("organization_id")
    private String organizationId;

    private List<String> roles;

    @Data
    public static class Inviter {
        private String name;
    }

    @Data
    public static class Invitee {
        private String email;
    }
}
