package ai.kolate.message_publisher.service;

import ai.kolate.message_publisher.dto.PublishMessageRequest;

public interface RequestValidator {
    void validateRequest(PublishMessageRequest publishMessageRequest);
}
