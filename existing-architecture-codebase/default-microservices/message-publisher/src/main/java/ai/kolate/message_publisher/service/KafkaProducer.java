package ai.kolate.message_publisher.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.producer.RecordMetadata;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Component;

import java.util.concurrent.CompletableFuture;

@Component
@Slf4j
public class KafkaProducer {

    private final KafkaTemplate<String, String> kafkaTemplate;

    /**
     * Constructor to initialize KafkaProducer with a KafkaTemplate.
     *
     * @param kafkaTemplate the KafkaTemplate used to send messages.
     */
    public KafkaProducer(KafkaTemplate<String, String> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    /**
     * Sends a message to a specified Kafka topic asynchronously and logs the result using CompletableFuture.
     *
     * @param kafkaTopic the name of the Kafka topic to which the message will be sent.
     * @param message    the content of the message to send.
     */
    public void sendMessage(String kafkaTopic, String message) {
        log.info("Sending message to topic [{}]: {}", kafkaTopic, message);

        CompletableFuture<SendResult<String, String>> future = kafkaTemplate.send(kafkaTopic, message);

        future.whenComplete((result, ex) -> {
            if (ex == null) {
                RecordMetadata metadata = result.getRecordMetadata();
                log.info("Message sent successfully to topic [{}] at offset [{}], partition [{}]",
                        metadata.topic(), metadata.offset(), metadata.partition());
            } else {
                log.error("Failed to send message to topic [{}]: {}", kafkaTopic, ex.getMessage(), ex);
            }
        });
    }
}
