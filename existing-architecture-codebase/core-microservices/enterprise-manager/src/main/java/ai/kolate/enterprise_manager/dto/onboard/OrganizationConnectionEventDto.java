package ai.kolate.enterprise_manager.dto.onboard;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrganizationConnectionEventDto {

    private String id;
    private String source;
    private String specversion;
    private String type;
    private LocalDateTime time;
    private EventData data;

    @JsonProperty("a0tenant")
    private String a0Tenant;

    @JsonProperty("a0stream")
    private String a0Stream;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EventData {
        @JsonProperty("object")
        private EventObject eventObject;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EventObject {
        @JsonProperty("assign_membership_on_login")
        private boolean assignMembershipOnLogin;

        private Connection connection;

        @JsonProperty("is_signup_enabled")
        private boolean isSignupEnabled;

        private Organization organization;

        @JsonProperty("show_as_button")
        private boolean showAsButton;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Connection {
        private String id;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Organization {
        private String id;
        private String name;
    }
}
