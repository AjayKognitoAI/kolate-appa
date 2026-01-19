package ai.kolate.enterprise_manager.service.impl;

import ai.kolate.enterprise_manager.client.ProjectManagerClient;
import ai.kolate.enterprise_manager.client.UserManagerClient;
import ai.kolate.enterprise_manager.dto.EnterpriseOnboardProgress.EnterpriseStatisticsDTO;
import ai.kolate.enterprise_manager.dto.EnterpriseOnboardProgress.RequestUpdateEnterpriseProgress;
import ai.kolate.enterprise_manager.dto.EnterpriseOnboardProgress.ResponseEopDTO;
import ai.kolate.enterprise_manager.dto.EnterpriseOnboardProgress.UserCountResponseDTO;
import ai.kolate.enterprise_manager.dto.project.ProjectStatsResponse;
import ai.kolate.enterprise_manager.exception.ResourceNotFoundException;
import ai.kolate.enterprise_manager.model.Enterprise;
import ai.kolate.enterprise_manager.model.EnterpriseOnboardingProgress;
import ai.kolate.enterprise_manager.model.enums.EnterpriseOnboardStep;
import ai.kolate.enterprise_manager.repository.EnterpriseOnboardProgressRepository;
import ai.kolate.enterprise_manager.repository.EnterpriseRepository;
import ai.kolate.enterprise_manager.service.EnterpriseOnboardProgressService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EnterpriseOnboardProgressImpl implements EnterpriseOnboardProgressService {

    private final EnterpriseOnboardProgressRepository eopRepository;
    private final EnterpriseRepository enterpriseRepository;
    private final ProjectManagerClient projectManagerClient;
    private final UserManagerClient userManagerClient;


    public EnterpriseOnboardProgressImpl(EnterpriseOnboardProgressRepository eopRepository,
                                         EnterpriseRepository enterpriseRepository,
                                         ProjectManagerClient projectManagerClient,
                                         UserManagerClient userManagerClient) {
        this.eopRepository = eopRepository;
        this.enterpriseRepository = enterpriseRepository;
        this.projectManagerClient = projectManagerClient;
        this.userManagerClient = userManagerClient;
    }

    @Override
    public ResponseEopDTO getEnterpriseProgress(String orgId) {
        EnterpriseOnboardingProgress onboard = eopRepository.findByOrganizationId(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Enterprise not found with Org ID: " + orgId));

        return toDTO(onboard);
    }

    @Override
    @Transactional
    public ResponseEopDTO updateEnterpriseProgress(String orgId, RequestUpdateEnterpriseProgress request) {
        Enterprise enterprise = enterpriseRepository.findByOrganizationId(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Enterprise not found with Org ID: " + orgId));

        EnterpriseOnboardingProgress onboard = eopRepository.findByOrganizationId(orgId)
                .orElseGet(() -> EnterpriseOnboardingProgress.builder()
                        .enterprise(enterprise)
                        .organizationId(enterprise.getOrganizationId())
                        .profileUpdated(false)
                        .invitedMember(false)
                        .createdProject(false)
                        .build());

        switch (request.getStep()) {
            case PROFILE_UPDATED ->  onboard.setProfileUpdated(true);
            case INVITED_MEMBER -> onboard.setInvitedMember(true);
            case CREATED_PROJECT -> onboard.setCreatedProject(true);
            default -> throw new IllegalArgumentException("Unknown onboarding step: " + request.getStep());
        }

        eopRepository.save(onboard);

        return toDTO(onboard);

    }

    @Override
    public EnterpriseStatisticsDTO getEnterpriseStatistics(String orgId) {
        ProjectStatsResponse projectStats = projectManagerClient.getEnterpriseProjectStats(orgId);
        UserCountResponseDTO userCountResponse = userManagerClient.getUsersCount(orgId);

        return EnterpriseStatisticsDTO.builder()
                .activeProjects(projectStats.getActiveProjects())
                .completedProjects(projectStats.getCompletedProjects())
                .totalUsers(userCountResponse.getUsersCount())
                .build();
    }

    private ResponseEopDTO toDTO(EnterpriseOnboardingProgress onboard) {
        return ResponseEopDTO.builder()
                .profileUpdated(onboard.getProfileUpdated())
                .invitedMember(onboard.getInvitedMember())
                .createdProject(onboard.getCreatedProject())
                .build();
    }

}
