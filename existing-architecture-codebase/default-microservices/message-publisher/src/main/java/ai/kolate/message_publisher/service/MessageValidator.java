package ai.kolate.message_publisher.service;

import ai.kolate.message_publisher.resource.KafkaTopics;

public interface MessageValidator {
    void validateMessage(KafkaTopics topic, String message);
}
