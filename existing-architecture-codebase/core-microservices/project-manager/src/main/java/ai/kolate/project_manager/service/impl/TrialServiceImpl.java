package ai.kolate.project_manager.service.impl;

import ai.kolate.project_manager.dto.*;
import ai.kolate.project_manager.dto.kafka.KafkaTopics;
import ai.kolate.project_manager.dto.trial.ExecutionRecord;
import ai.kolate.project_manager.dto.trial.ShareTrialRequestDTO;
import ai.kolate.project_manager.dto.trial.TrialShareResponseDTO;
import ai.kolate.project_manager.dto.trial.TrialShareUserDTO;
import ai.kolate.project_manager.exception.FeignClientException;
import ai.kolate.project_manager.feignclient.TrialManagerClient;
import ai.kolate.project_manager.feignclient.TrialManagerMongoClient;
import ai.kolate.project_manager.service.MessagePublisherService;
import ai.kolate.project_manager.service.TrialService;
import feign.FeignException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class TrialServiceImpl implements TrialService {

    private static final Logger logger = LoggerFactory.getLogger(TrialServiceImpl.class);

    private final TrialManagerClient trialManagerClient;
    private final TrialManagerMongoClient trialManagerMongoClient;
    private final MessagePublisherService messagePublisherService;

    public TrialServiceImpl(TrialManagerClient trialManagerClient,
                            TrialManagerMongoClient trialManagerMongoClient,
                            MessagePublisherService messagePublisherService) {
        this.trialManagerClient = trialManagerClient;
        this.trialManagerMongoClient = trialManagerMongoClient;
        this.messagePublisherService = messagePublisherService;
    }

    @Override
    public TrialShareResponseDTO createTrialShare(
            String orgId, String projectId, String trialSlug, ShareTrialRequestDTO request) {
        try {
            logger.debug("Sharing trial : {}", request.getExecutionId());
            TrialShareResponseDTO response = trialManagerClient.createTrialShare(projectId, trialSlug, request);
            logger.info("Successfully shared trial with ID: {}", response.getId());
            Map<String, Object> responseWithOrgId = Map.of(
                    "orgId", orgId,
                    "type", "TRIAL_SHARED",
                    "response", response
            );
            messagePublisherService.publishMessage(responseWithOrgId, KafkaTopics.TOPIC_NOTIFICATION_ALL);
            return response;
        } catch (FeignException e) {
            logger.error("Failed to Sharing trial: {}", e.contentUTF8());
            throw new FeignClientException(e.contentUTF8(), e.status(), e);
        }
    }

    @Override
    public PagedResponse<TrialShareResponseDTO> getTrialShares(
            String projectId, String trialSlug, String direction,
            String userId, int page, int size, String query) {
        try {
            logger.debug("Fetching trial shares for userId={}", userId);

            PagedResponse<TrialShareResponseDTO> response = trialManagerClient.getTrialShares(
                    projectId, trialSlug, direction, userId, page, size, query);

            logger.info("Fetched {} trial shares for userId={}", response.getContent().size(), userId);

            List<String> executionIds = response.getContent().stream()
                    .map(TrialShareResponseDTO::getExecutionId)
                    .filter(Objects::nonNull)
                    .distinct()
                    .toList();

            if (!executionIds.isEmpty()) {
                logger.info("Fetching executions for projectId={}, trialSlug={}, executionIds={}",
                        projectId, trialSlug, executionIds);

                List<ExecutionRecord> executions = trialManagerMongoClient
                        .getExecutionsRecordsByIds(projectId, trialSlug, executionIds);

                Map<String, ExecutionRecord> executionMap = executions.stream()
                        .collect(Collectors.toMap(ExecutionRecord::getExecutionId, e -> e));

                response.getContent().forEach(c -> {
                    ExecutionRecord exec = executionMap.get(c.getExecutionId());
                    if (exec == null) {
                        logger.warn("Missing execution for executionId={} in trialSlug={}", c.getExecutionId(), trialSlug);
                    }
                    c.setExecution(exec);
                });
            }

            return response;
        } catch (FeignException e) {
            logger.error("Feign error - status={}, methodKey={}, message={}, body={}",
                    e.status(), e.request().method(), e.getMessage(), e.contentUTF8(), e);
            throw new FeignClientException(e.contentUTF8(), e.status(), e);
        }
    }
}
