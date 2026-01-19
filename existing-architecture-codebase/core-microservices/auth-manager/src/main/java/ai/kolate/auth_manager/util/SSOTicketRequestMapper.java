package ai.kolate.auth_manager.util;

import ai.kolate.auth_manager.config.SSOProperties;
import ai.kolate.auth_manager.dto.SSOTicketRequestDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class SSOTicketRequestMapper {

    private final SSOProperties ssoProperties;

    public SSOTicketRequestDTO.Auth0SSOTicketRequest toAuth0Request(SSOTicketRequestDTO dto) {
        return SSOTicketRequestDTO.Auth0SSOTicketRequest.builder()
                .connectionConfig(SSOTicketRequestDTO.ConnectionConfig.builder()
                        .name(dto.getDisplayName().toLowerCase().replaceAll("[ .]", "-"))
                        .displayName(dto.getDisplayName())
                        .isDomainConnection(ssoProperties.isDomainConnection())
                        .showAsButton(ssoProperties.isShowAsButton())
                        .options(SSOTicketRequestDTO.ConnectionOptions.builder()
                                .iconUrl(dto.getIconUrl())
                                .domainAliases(dto.getDomainAliases())
                                .build())
                        .build())
                .enabledOrganizations(List.of(SSOTicketRequestDTO.EnabledOrganization.builder()
                        .organizationId(dto.getOrganizationId())
                        .assignMembershipOnLogin(true)
                        .showAsButton(ssoProperties.isShowAsButtonForOrg())
                        .build()))
                .domainAliasesConfig(SSOTicketRequestDTO.DomainAliasesConfig.builder()
                        .domainVerification(ssoProperties.getDomainVerification())
                        .build())
                .build();
    }
}