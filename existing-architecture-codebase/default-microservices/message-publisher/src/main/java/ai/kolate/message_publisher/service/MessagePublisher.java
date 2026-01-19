package ai.kolate.message_publisher.service;

import ai.kolate.message_publisher.config.IServiceFactory;
import ai.kolate.message_publisher.resource.KafkaTopics;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class MessagePublisher {

    private final IServiceFactory serviceFactory;
    private final Validator validator;

    public MessagePublisher (IServiceFactory serviceFactory, Validator validator) {
        this.serviceFactory = serviceFactory;
        this.validator = validator;
    }

    public void publishMessage(KafkaTopics topic, String message) {
        log.info("Publishing to topic [{}]", topic);
        validator.validateMessage(topic, message);
        serviceFactory.getKafkaProducer().sendMessage(topic.getTopicName(), message);
    }
}
