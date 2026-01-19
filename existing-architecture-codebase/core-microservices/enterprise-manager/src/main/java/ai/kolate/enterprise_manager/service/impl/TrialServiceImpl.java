package ai.kolate.enterprise_manager.service.impl;

import ai.kolate.enterprise_manager.dto.trial.TrialCreateDTO;
import ai.kolate.enterprise_manager.dto.trial.TrialDTO;
import ai.kolate.enterprise_manager.dto.trial.TrialUpdateDTO;
import ai.kolate.enterprise_manager.model.Module;
import ai.kolate.enterprise_manager.model.Trial;
import ai.kolate.enterprise_manager.repository.ModuleRepository;
import ai.kolate.enterprise_manager.repository.TrialRepository;
import ai.kolate.enterprise_manager.service.TrialService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional
public class TrialServiceImpl implements TrialService {

    private final TrialRepository trialRepository;
    private final ModuleRepository moduleRepository;

    @Override
    public TrialDTO createTrial(TrialCreateDTO trialCreateDTO) {
        log.info("Creating trial with slug: {}", trialCreateDTO.getSlug());

        // Check if slug already exists
        if (trialRepository.existsBySlug(trialCreateDTO.getSlug())) {
            throw new IllegalArgumentException("Trial with slug '" + trialCreateDTO.getSlug() + "' already exists");
        }

        // Validate module exists
        Module module = moduleRepository.findById(trialCreateDTO.getModuleId())
                .orElseThrow(() -> new EntityNotFoundException("Module not found with ID: " + trialCreateDTO.getModuleId()));

        // Validate module is not standalone (standalone modules don't have trials)
        if (module.getIsStandalone()) {
            throw new IllegalArgumentException("Cannot create trial for standalone module: " + module.getName());
        }

        Trial trial = Trial.builder()
                .module(module)
                .slug(trialCreateDTO.getSlug())
                .name(trialCreateDTO.getName())
                .iconUrl(trialCreateDTO.getIconUrl())
                .description(trialCreateDTO.getDescription())
                .build();

        Trial savedTrial = trialRepository.save(trial);
        log.info("Trial created successfully with ID: {}", savedTrial.getId());

        return mapToDTO(savedTrial);
    }

    @Override
    public TrialDTO updateTrial(TrialUpdateDTO trialUpdateDTO) {
        log.info("Updating trial with ID: {}", trialUpdateDTO.getId());

        Trial trial = trialRepository.findById(trialUpdateDTO.getId())
                .orElseThrow(() -> new EntityNotFoundException("Trial not found with ID: " + trialUpdateDTO.getId()));

        // Update module if provided
        if (trialUpdateDTO.getModuleId() != null) {
            Module module = moduleRepository.findById(trialUpdateDTO.getModuleId())
                    .orElseThrow(() -> new EntityNotFoundException("Module not found with ID: " + trialUpdateDTO.getModuleId()));

            if (module.getIsStandalone()) {
                throw new IllegalArgumentException("Cannot assign trial to standalone module: " + module.getName());
            }

            trial.setModule(module);
        }

        // Update slug if provided and different
        if (trialUpdateDTO.getSlug() != null && !trialUpdateDTO.getSlug().equals(trial.getSlug())) {
            if (trialRepository.existsBySlug(trialUpdateDTO.getSlug())) {
                throw new IllegalArgumentException("Trial with slug '" + trialUpdateDTO.getSlug() + "' already exists");
            }
            trial.setSlug(trialUpdateDTO.getSlug());
        }

        // Update other fields if provided
        if (trialUpdateDTO.getName() != null) {
            trial.setName(trialUpdateDTO.getName());
        }

        if (trialUpdateDTO.getIconUrl() != null) {
            trial.setIconUrl(trialUpdateDTO.getIconUrl());
        }

        if (trialUpdateDTO.getDescription() != null) {
            trial.setDescription(trialUpdateDTO.getDescription());
        }

        Trial updatedTrial = trialRepository.save(trial);
        log.info("Trial updated successfully with ID: {}", updatedTrial.getId());

        return mapToDTO(updatedTrial);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<TrialDTO> getTrialById(Integer id) {
        log.info("Getting trial by ID: {}", id);
        return trialRepository.findById(id).map(this::mapToDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<TrialDTO> getTrialBySlug(String slug) {
        log.info("Getting trial by slug: {}", slug);
        return trialRepository.findBySlug(slug).map(this::mapToDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TrialDTO> getAllTrials() {
        log.info("Getting all trials");
        return trialRepository.findAll(Sort.by(Sort.Direction.ASC, "id")).stream()
                .map(this::mapToDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<TrialDTO> getTrialsByModuleId(Integer moduleId) {
        log.info("Getting trials by module ID: {}", moduleId);

        Module module = moduleRepository.findById(moduleId)
                .orElseThrow(() -> new EntityNotFoundException("Module not found with ID: " + moduleId));

        return trialRepository.findByModule(module, Sort.by(Sort.Direction.ASC, "id")).stream()
                .map(this::mapToDTO)
                .toList();
    }

    @Override
    public boolean deleteTrialById(Integer id) {
        log.info("Deleting trial with ID: {}", id);

        if (trialRepository.existsById(id)) {
            trialRepository.deleteById(id);
            log.info("Trial deleted successfully with ID: {}", id);
            return true;
        }

        log.warn("Trial not found with ID: {}", id);
        return false;
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsBySlug(String slug) {
        return trialRepository.existsBySlug(slug);
    }

    private TrialDTO mapToDTO(Trial trial) {
        return TrialDTO.builder()
                .id(trial.getId())
                .moduleId(trial.getModule().getId())
                .moduleName(trial.getModule().getName())
                .slug(trial.getSlug())
                .name(trial.getName())
                .iconUrl(trial.getIconUrl())
                .description(trial.getDescription())
                .createdAt(trial.getCreatedAt())
                .updatedAt(trial.getUpdatedAt())
                .build();
    }
}
