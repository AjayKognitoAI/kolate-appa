package ai.kolate.enterprise_manager.service.impl;

import ai.kolate.enterprise_manager.dto.EnterpriseModuleAccess.*;
import ai.kolate.enterprise_manager.model.*;
import ai.kolate.enterprise_manager.model.Module;
import ai.kolate.enterprise_manager.repository.*;
import ai.kolate.enterprise_manager.service.EnterpriseModuleAccessService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Implementation of EnterpriseModuleAccessService
 */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional
public class EnterpriseModuleAccessServiceImpl implements EnterpriseModuleAccessService {

    private final EnterpriseModuleAccessRepository accessRepository;
    private final EnterpriseRepository enterpriseRepository;
    private final ModuleRepository moduleRepository;
    private final TrialRepository trialRepository;

    /**
     * Grant or revoke access for an enterprise based on the request DTO
     */
    @Override
    public EnterpriseModuleAccessResultDTO manageEnterpriseAccess(EnterpriseModuleAccessRequestDTO requestDTO) {
        log.info("Managing enterprise access for enterprise: {}", requestDTO.getEnterpriseId());

        Enterprise enterprise = enterpriseRepository.findById(requestDTO.getEnterpriseId())
                .orElseThrow(() -> new EntityNotFoundException("Enterprise not found with ID: " + requestDTO.getEnterpriseId()));

        List<EnterpriseModuleAccessDTO> granted = new ArrayList<>();
        List<EnterpriseModuleAccessDTO> revoked = new ArrayList<>();
        List<AccessErrorDTO> errors = new ArrayList<>();

        // ✅ Grant Access
        if (requestDTO.getGrantAccess() != null && !requestDTO.getGrantAccess().isEmpty()) {
            log.info("Processing {} grant access requests", requestDTO.getGrantAccess().size());
            for (AccessRequestDTO grantRequest : requestDTO.getGrantAccess()) {
                try {
                    EnterpriseModuleAccessDTO grantedAccess =
                            grantAccess(enterprise, requestDTO.getOrganizationId(), grantRequest);
                    if (grantedAccess != null) {
                        granted.add(grantedAccess);
                    }
                } catch (Exception e) {
                    log.error("Error granting access to module: {} for enterprise: {}. Error: {}",
                            grantRequest.getModuleId(), enterprise.getId(), e.getMessage());
                    errors.add(AccessErrorDTO.builder()
                            .moduleId(grantRequest.getModuleId())
                            .trialId(grantRequest.getTrialId())
                            .action("GRANT")
                            .error(e.getMessage())
                            .build());
                }
            }
        }

        // ✅ Revoke Access
        if (requestDTO.getRevokeAccess() != null && !requestDTO.getRevokeAccess().isEmpty()) {
            log.info("Processing {} revoke access requests", requestDTO.getRevokeAccess().size());
            for (AccessRequestDTO revokeRequest : requestDTO.getRevokeAccess()) {
                try {
                    EnterpriseModuleAccessDTO revokedAccess = revokeAccess(enterprise, revokeRequest);
                    if (revokedAccess != null) {
                        revoked.add(revokedAccess);
                    }
                } catch (Exception e) {
                    log.error("Error revoking access to module: {} for enterprise: {}. Error: {}",
                            revokeRequest.getModuleId(), enterprise.getId(), e.getMessage());
                    errors.add(AccessErrorDTO.builder()
                            .moduleId(revokeRequest.getModuleId())
                            .trialId(revokeRequest.getTrialId())
                            .action("REVOKE")
                            .error(e.getMessage())
                            .build());
                }
            }
        }

        log.info("Access management completed. Granted: {}, Revoked: {}, Errors: {}",
                granted.size(), revoked.size(), errors.size());

        return EnterpriseModuleAccessResultDTO.builder()
                .granted(granted)
                .revoked(revoked)
                .errors(errors)
                .build();
    }

    /**
     * Handles granting access for module or trial to an enterprise
     */
    private EnterpriseModuleAccessDTO grantAccess(Enterprise enterprise, String organizationId, AccessRequestDTO request) {
        Module module = moduleRepository.findById(request.getModuleId())
                .orElseThrow(() -> new EntityNotFoundException("Module not found with ID: " + request.getModuleId()));

        Trial trial = null;

        // 🔍 Validate trial requirements
        if (request.getTrialId() != null) {
            if (module.getIsStandalone()) {
                throw new IllegalArgumentException("Cannot assign trial to standalone module: " + module.getName());
            }
            trial = trialRepository.findById(request.getTrialId())
                    .orElseThrow(() -> new EntityNotFoundException("Trial not found with ID: " + request.getTrialId()));

            if (!trial.getModule().getId().equals(module.getId())) {
                throw new IllegalArgumentException("Trial '" + trial.getName() + "' does not belong to module '" + module.getName() + "'");
            }
        } else if (!module.getIsStandalone()) {
            throw new IllegalArgumentException("Non-standalone module '" + module.getName() + "' requires a trial ID");
        }

        // 🚫 Avoid duplicate access
        if (accessRepository.existsByEnterpriseAndModuleAndTrial(enterprise, module, trial)) {
            log.warn("Access already exists for enterprise: {}, module: {}, trial: {}",
                    enterprise.getId(), module.getId(), trial != null ? trial.getId() : "null");
            return null;
        }

        // ✅ Save new access
        EnterpriseModuleAccess access = EnterpriseModuleAccess.builder()
                .enterprise(enterprise)
                .organizationId(organizationId)
                .module(module)
                .trial(trial)
                .build();

        access = accessRepository.save(access);

        // ✅ Use mapper
        return EnterpriseModuleAccessMapper.toDTO(access);
    }

    /**
     * Handles revoking access for module or trial from an enterprise
     */
    private EnterpriseModuleAccessDTO revokeAccess(Enterprise enterprise, AccessRequestDTO request) {
        Module module = moduleRepository.findById(request.getModuleId())
                .orElseThrow(() -> new EntityNotFoundException("Module not found with ID: " + request.getModuleId()));

        Trial trial = null;
        if (request.getTrialId() != null) {
            trial = trialRepository.findById(request.getTrialId())
                    .orElseThrow(() -> new EntityNotFoundException("Trial not found with ID: " + request.getTrialId()));
        }

        Optional<EnterpriseModuleAccess> existingAccess =
                accessRepository.findByEnterpriseAndModuleAndTrial(enterprise, module, trial);

        if (existingAccess.isPresent()) {
            EnterpriseModuleAccess entity = existingAccess.get();
            accessRepository.delete(entity);
            // ✅ Use mapper
            return EnterpriseModuleAccessMapper.toDTO(entity);
        } else {
            throw new EntityNotFoundException("Access record not found for the specified enterprise, module and trial combination");
        }
    }

    /**
     * Retrieves access by Organization ID
     */
    @Override
    @Transactional(readOnly = true)
    public List<ModuleDTO> getAccessByOrganizationId(String organizationId) {
        List<EnterpriseModuleAccess> accessList = accessRepository.findByOrganizationId(organizationId);
        return groupByModule(accessList);
    }

    /**
     * Retrieves all modules and trial access for an enterprise
     */
    @Override
    @Transactional(readOnly = true)
    public List<ModuleDTO> getAllModulesAndTrialsByEnterprise(UUID enterpriseId) {
        List<EnterpriseModuleAccess> enterpriseAccess = accessRepository.findByEnterpriseId(enterpriseId);

        Map<Integer, Set<Integer>> moduleTrialAccessMap = enterpriseAccess.stream()
                .filter(a -> a.getTrial() != null)
                .collect(Collectors.groupingBy(
                        a -> a.getModule().getId(),
                        Collectors.mapping(a -> a.getTrial().getId(), Collectors.toSet())
                ));

        Set<Integer> standaloneModuleAccess = enterpriseAccess.stream()
                .filter(a -> a.getTrial() == null)
                .map(a -> a.getModule().getId())
                .collect(Collectors.toSet());

        List<Module> allModules = moduleRepository.findAllWithTrials(Sort.by(Sort.Direction.ASC, "id"));

        return allModules.stream().map(module -> {
            List<TrialDTO> trialDTOs = module.getTrials().stream()
                    .map(trial -> EnterpriseModuleAccessMapper.toTrialWithAccessDTO(
                            trial,
                            module.getIsStandalone() && standaloneModuleAccess.contains(module.getId())
                                    || moduleTrialAccessMap.getOrDefault(module.getId(), Collections.emptySet())
                                    .contains(trial.getId())
                    ))
                    .toList();

            boolean moduleAccess = module.getIsStandalone()
                    ? standaloneModuleAccess.contains(module.getId())
                    : !trialDTOs.isEmpty() && trialDTOs.stream().allMatch(TrialDTO::getTrialAccess);

            ModuleDTO dto = EnterpriseModuleAccessMapper.toModuleWithAccessDTO(module, moduleAccess);
            dto.setTrials(trialDTOs);
            return dto;
        }).toList();
    }


    /**
     * Groups EnterpriseModuleAccess records by module for Organization queries
     */
    private List<ModuleDTO> groupByModule(List<EnterpriseModuleAccess> accessList) {
        return accessList.stream()
                .collect(Collectors.groupingBy(access -> access.getModule().getId()))
                .entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> {
                    Module module = entry.getValue().get(0).getModule();

                    List<TrialDTO> trials = entry.getValue().stream()
                            .filter(a -> a.getTrial() != null)
                            .map(a -> EnterpriseModuleAccessMapper.toTrialDTO(a.getTrial()))
                            .sorted(Comparator.comparing(TrialDTO::getId)) // Sort by TrialDTO id
                            .toList();

                    ModuleDTO dto = EnterpriseModuleAccessMapper.toModuleDTO(module);
                    dto.setTrials(trials);
                    return dto;
                })
                .toList();
    }
}
