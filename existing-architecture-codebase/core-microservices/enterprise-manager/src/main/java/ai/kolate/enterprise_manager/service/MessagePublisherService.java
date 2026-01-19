package ai.kolate.enterprise_manager.service;

import ai.kolate.enterprise_manager.dto.kafka.KafkaTopics;

public interface MessagePublisherService {
    boolean publishMessage(Object message, KafkaTopics topic);
}
