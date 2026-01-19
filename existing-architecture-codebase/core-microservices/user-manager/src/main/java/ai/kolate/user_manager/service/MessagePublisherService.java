package ai.kolate.user_manager.service;

import ai.kolate.user_manager.model.enums.KafkaTopics;

public interface MessagePublisherService {
    boolean publishMessage(Object message, KafkaTopics topic);
}
