package ai.kolate.auth_manager.dto;

import ai.kolate.auth_manager.config.ValueConfig;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
@Builder
public class SSOTicketRequestDTO {

    @JsonProperty("display_name")
    @NotBlank(message = "Display name is required")
    @Pattern(regexp = "^[a-zA-Z0-9 .-]+$", message = "Display name can only contain letters[a-zA-z], numbers[0-9], spaces, dash[-] and period[.]")
    private String displayName;

    @JsonProperty("icon_url")
    private String iconUrl;

    @JsonProperty("domain_aliases")
    private List<String> domainAliases;

    @JsonProperty("organization_id")
    @NotBlank(message = "Organization id is required")
    private String organizationId;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class Auth0SSOTicketRequest {
        @JsonProperty("connection_config")
        private ConnectionConfig connectionConfig;

        @JsonProperty("enabled_clients")
        private List<String> enabledClients;

        @JsonProperty("enabled_organizations")
        private List<EnabledOrganization> enabledOrganizations;

        @JsonProperty("ttl_sec")
        private Integer ttlSec;

        @JsonProperty("domain_aliases_config")
        private DomainAliasesConfig domainAliasesConfig;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class ConnectionConfig {
        @JsonProperty("name")
        private String name;

        @JsonProperty("display_name")
        private String displayName;

        @JsonProperty("is_domain_connection")
        private boolean isDomainConnection;

        @JsonProperty("show_as_button")
        private boolean showAsButton;

        @JsonProperty("metadata")
        private Map<String, Object> metadata;

        @JsonProperty("options")
        private ConnectionOptions options;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class ConnectionOptions {
        @JsonProperty("icon_url")
        private String iconUrl;

        @JsonProperty("domain_aliases")
        private List<String> domainAliases;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class EnabledOrganization {
        @JsonProperty("organization_id")
        private String organizationId;

        @JsonProperty("assign_membership_on_login")
        private boolean assignMembershipOnLogin;

        @JsonProperty("show_as_button")
        private boolean showAsButton;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class DomainAliasesConfig {
        @JsonProperty("domain_verification")
        private String domainVerification;
    }
}
