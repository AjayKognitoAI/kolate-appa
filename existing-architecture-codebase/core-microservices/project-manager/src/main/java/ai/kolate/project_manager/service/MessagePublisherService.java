package ai.kolate.project_manager.service;


import ai.kolate.project_manager.dto.kafka.KafkaTopics;

public interface MessagePublisherService {
    boolean publishMessage(Object message, KafkaTopics topic);
}
