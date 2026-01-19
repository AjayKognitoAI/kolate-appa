package ai.kolate.enterprise_manager.service.impl;

import ai.kolate.enterprise_manager.client.MessagePublisherClient;
import ai.kolate.enterprise_manager.dto.kafka.KafkaTopics;
import ai.kolate.enterprise_manager.dto.kafka.PublishMessageRequest;
import ai.kolate.enterprise_manager.service.MessagePublisherService;
import com.fasterxml.jackson.databind.ObjectMapper;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class MessagePublisherServiceImpl implements MessagePublisherService {

    private final MessagePublisherClient messagePublisherClient;
    private final ObjectMapper objectMapper;

    @Override
    public boolean publishMessage(Object message, KafkaTopics topic) {
        try {
            String messageJson = objectMapper.writeValueAsString(message);

            PublishMessageRequest request = PublishMessageRequest.builder()
                    .kafkaTopicName(topic.name())
                    .message(messageJson)
                    .build();

            log.info("Publishing message to topic :: {} | message :: {}", topic, message);

            ResponseEntity<?> response = messagePublisherClient.publishMessage(request);
            return response.getStatusCode().is2xxSuccessful();
        } catch (FeignException e) {
            log.error("Error publishing message to Kafka. Status: {}, Message: {}",
                    e.status(), e.getMessage());
            return false;
        } catch (Exception e) {
            log.error("Error serializing or publishing message", e);
            return false;
        }
    }
}
