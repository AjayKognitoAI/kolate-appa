package ai.kolate.user_manager.dto.auth;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class InvitationRequestDTO {

    @Valid
    @NotNull
    private Inviter inviter;

    @Valid
    @NotNull
    private Invitee invitee;

    @JsonProperty("client_id")
    private String clientId;

    @JsonProperty("connection_id")
    private String connectionId;

    private List<String> roles;

    @JsonProperty("send_invitation_email")
    private Boolean sendInvitationEmail = true;

    @Data
    public static class Inviter {
        @NotBlank
        private String name;
    }

    @Data
    public static class Invitee {
        @NotBlank
        @Email
        private String email;
    }
}
