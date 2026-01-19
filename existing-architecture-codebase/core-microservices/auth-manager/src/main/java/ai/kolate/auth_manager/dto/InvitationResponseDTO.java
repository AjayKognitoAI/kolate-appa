package ai.kolate.auth_manager.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.time.Instant;
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

//    @JsonProperty("created_at")
//    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSSX", timezone = "UTC")
//    private Instant createdAt;
//
//    @JsonProperty("expires_at")
//    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSSX", timezone = "UTC")
//    private Instant expiresAt;

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
