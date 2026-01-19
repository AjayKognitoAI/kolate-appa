package ai.kolate.enterprise_manager.service;

import ai.kolate.enterprise_manager.dto.EnterpriseOnboardProgress.EnterpriseStatisticsDTO;
import ai.kolate.enterprise_manager.dto.EnterpriseOnboardProgress.RequestUpdateEnterpriseProgress;
import ai.kolate.enterprise_manager.dto.EnterpriseOnboardProgress.ResponseEopDTO;
import ai.kolate.enterprise_manager.model.enums.EnterpriseOnboardStep;

public interface EnterpriseOnboardProgressService {

    ResponseEopDTO getEnterpriseProgress(String orgId);

    ResponseEopDTO updateEnterpriseProgress(String orgId, RequestUpdateEnterpriseProgress request);

    EnterpriseStatisticsDTO getEnterpriseStatistics(String orgId);
}
