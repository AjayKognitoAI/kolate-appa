package ai.kolate.message_publisher.service;

import ai.kolate.message_publisher.config.IServiceFactory;
import ai.kolate.message_publisher.dto.PublishMessageRequest;
import ai.kolate.message_publisher.exception.InvalidRequestException;
import ai.kolate.message_publisher.resource.KafkaTopics;
import ai.kolate.message_publisher.resource.template.CreateInvitedAdminRequest;
import ai.kolate.message_publisher.resource.template.DeleteAdminRequestDTO;
import ai.kolate.message_publisher.resource.template.Foo;
import ai.kolate.message_publisher.resource.template.UpdateAdminRequestDTO;
import com.google.gson.Gson;
import com.google.gson.JsonSyntaxException;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang.StringUtils;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;

@Component
@Slf4j
public class Validator implements MessageValidator, RequestValidator {

    private final Gson gson;

    // Map of topic to model class
    private static final Map<KafkaTopics, Class<?>> TOPIC_MODEL_MAPPING = Map.ofEntries(
            Map.entry(KafkaTopics.TOPIC_FOO, Foo.class),
            Map.entry(KafkaTopics.TOPIC_CREATE_ENTERPRISE_ADMIN, CreateInvitedAdminRequest.class),
            Map.entry(KafkaTopics.TOPIC_UPDATE_ENTERPRISE_ADMIN, UpdateAdminRequestDTO.class),
            Map.entry(KafkaTopics.TOPIC_DELETE_ENTERPRISE_ADMIN, DeleteAdminRequestDTO.class)
            // Add other mappings...
    );

    private static final Set<KafkaTopics> LOGGING_ONLY_TOPICS = Set.of(
            KafkaTopics.TOPIC_NOTIFICATION_EMAIL,
            KafkaTopics.TOPIC_NOTIFICATION_ALL,
            KafkaTopics.TOPIC_PROVISION_INFRA
            // Add other logging-only topics...
    );

    public Validator(IServiceFactory factory) {
        this.gson = factory.getGson();
    }

    @Override
    public void validateMessage(KafkaTopics topic, String message) throws InvalidRequestException {
        if (LOGGING_ONLY_TOPICS.contains(topic)) {
            log.info("Skipping validation for logging-only topic [{}]: {}", topic, message);
            return;
        }

        Class<?> modelClass = TOPIC_MODEL_MAPPING.get(topic);
        if (modelClass == null) {
            throw new InvalidRequestException("Unknown topic: " + topic);
        }

        try {
            gson.fromJson(message, modelClass);
        } catch (JsonSyntaxException e) {
            throw new InvalidRequestException(String.format("Invalid JSON for topic [" + topic + "]", e));
        }
    }

    @Override
    public void validateRequest(PublishMessageRequest publishMessageRequest) {
        if (publishMessageRequest == null) {
            log.error("PublishMessageRequest is null");
            throw new InvalidRequestException("Request body cannot be null");
        }

        if (publishMessageRequest.getKafkaTopicName() == null) {
            log.error("Kafka topic name is missing in request");
            throw new InvalidRequestException("Kafka topic name cannot be null or empty");
        }

        if (StringUtils.isEmpty(publishMessageRequest.getMessage())) {
            log.error("Message body is missing in request");
            throw new InvalidRequestException("Message content cannot be null or empty");
        }
    }
}
