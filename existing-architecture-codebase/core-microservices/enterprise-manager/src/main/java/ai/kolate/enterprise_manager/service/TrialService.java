package ai.kolate.enterprise_manager.service;

import ai.kolate.enterprise_manager.dto.trial.TrialCreateDTO;
import ai.kolate.enterprise_manager.dto.trial.TrialDTO;
import ai.kolate.enterprise_manager.dto.trial.TrialUpdateDTO;

import java.util.List;
import java.util.Optional;

public interface TrialService {

    /**
     * Create a new trial
     * @param trialCreateDTO the trial creation data
     * @return the created trial DTO
     */
    TrialDTO createTrial(TrialCreateDTO trialCreateDTO);

    /**
     * Update an existing trial
     * @param trialUpdateDTO the trial update data
     * @return the updated trial DTO
     */
    TrialDTO updateTrial(TrialUpdateDTO trialUpdateDTO);

    /**
     * Get a trial by ID
     * @param id the trial ID
     * @return optional containing the trial DTO if found
     */
    Optional<TrialDTO> getTrialById(Integer id);

    /**
     * Get a trial by slug
     * @param slug the trial slug
     * @return optional containing the trial DTO if found
     */
    Optional<TrialDTO> getTrialBySlug(String slug);

    /**
     * Get all trials
     * @return list of all trial DTOs
     */
    List<TrialDTO> getAllTrials();

    /**
     * Get all trials for a module
     * @param moduleId the module ID
     * @return list of trial DTOs for the module
     */
    List<TrialDTO> getTrialsByModuleId(Integer moduleId);

    /**
     * Delete a trial by ID
     * @param id the trial ID
     * @return true if deleted successfully, false otherwise
     */
    boolean deleteTrialById(Integer id);

    /**
     * Check if a trial exists by slug
     * @param slug the trial slug
     * @return true if exists, false otherwise
     */
    boolean existsBySlug(String slug);
}
