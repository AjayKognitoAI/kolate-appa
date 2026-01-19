package ai.kolate.enterprise_manager.dto.EnterpriseModuleAccess;


import ai.kolate.enterprise_manager.model.*;
import ai.kolate.enterprise_manager.model.Module;

public class EnterpriseModuleAccessMapper {

    private EnterpriseModuleAccessMapper() {} // Utility class → prevent instantiation

    public static EnterpriseModuleAccessDTO toDTO(EnterpriseModuleAccess access) {
        return EnterpriseModuleAccessDTO.builder()
                .id(access.getId())
                .enterpriseId(access.getEnterprise().getId())
                .organizationId(access.getOrganizationId())
                .moduleId(access.getModule().getId())
                .trialId(access.getTrial() != null ? access.getTrial().getId() : null)
                .build();
    }

    public static ModuleDTO toModuleDTO(Module module) {
        return ModuleDTO.builder()
                .id(module.getId())
                .name(module.getName())
                .slug(module.getSlug())
                .isStandalone(module.getIsStandalone())
                .createdAt(module.getCreatedAt())
                .updatedAt(module.getUpdatedAt())
                .build();
    }

    public static TrialDTO toTrialDTO(Trial trial) {
        return TrialDTO.builder()
                .id(trial.getId())
                .name(trial.getName())
                .slug(trial.getSlug())
                .description(trial.getDescription())
                .iconUrl(trial.getIconUrl())
                .createdAt(trial.getCreatedAt())
                .updatedAt(trial.getUpdatedAt())
                .moduleId(trial.getModule().getId())
                .build();
    }

    public static ModuleDTO toModuleWithAccessDTO(Module module, boolean moduleAccess) {
        return ModuleDTO.builder()
                .id(module.getId())
                .name(module.getName())
                .slug(module.getSlug())
                .isStandalone(module.getIsStandalone())
                .moduleAccess(moduleAccess)
                .createdAt(module.getCreatedAt())
                .updatedAt(module.getUpdatedAt())
                .build();
    }

    public static TrialDTO toTrialWithAccessDTO(Trial trial, boolean trialAccess) {
        return TrialDTO.builder()
                .id(trial.getId())
                .name(trial.getName())
                .slug(trial.getSlug())
                .description(trial.getDescription())
                .iconUrl(trial.getIconUrl())
                .createdAt(trial.getCreatedAt())
                .updatedAt(trial.getUpdatedAt())
                .trialAccess(trialAccess)
                .moduleId(trial.getModule().getId())
                .build();
    }
}
