package ai.kolate.enterprise_manager.service;

import ai.kolate.enterprise_manager.dto.onboard.EnterpriseInviteRequest;
import ai.kolate.enterprise_manager.dto.onboard.EnterpriseInviteResponse;
import ai.kolate.enterprise_manager.dto.onboard.EnterpriseReInviteRequest;
import ai.kolate.enterprise_manager.dto.onboard.OnboardRequest;
import ai.kolate.enterprise_manager.dto.onboard.OnboardResponse;
import ai.kolate.enterprise_manager.dto.onboard.OrganizationConnectionEventDto;

public interface OnboardService {

    EnterpriseInviteResponse inviteEnterprise(EnterpriseInviteRequest request);
    EnterpriseInviteResponse reInviteEnterprise(EnterpriseReInviteRequest request);
    OnboardResponse onboardEnterprise(OnboardRequest request);
    void notifyInfraProvisioner(OrganizationConnectionEventDto data);

}
