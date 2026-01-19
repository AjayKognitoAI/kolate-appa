package ai.kolate.message_publisher.config;

import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;

import java.util.HashMap;
import java.util.Map;

@EnableKafka
@Configuration
@Slf4j
public class KafkaProducerConfig {
    @Value("${kafka.producer.bootstrap-server}")
    private String kafkaServer;

    /**
     * Creates a Kafka producer factory with the specified configuration properties. This method sets
     * up the necessary configuration for the Kafka producer, including the bootstrap server address,
     * key and value serializers, and maximum request size.
     *
     * @return A ProducerFactory<String, String> instance configured with the specified properties.
     *     This factory can be used to create Kafka producer instances.
     */
    @Bean
    public ProducerFactory<String, String> producerFactory() {
        // Create a map to hold the configuration properties
        final Map<String, Object> configProps = new HashMap<>();

        // Set the bootstrap server address
        configProps.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, kafkaServer);

        // Set the key serializer class
        configProps.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);

        // Set the value serializer class
        configProps.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class);

        // Set the maximum request size
        configProps.put(ProducerConfig.MAX_REQUEST_SIZE_CONFIG, 16 * 1024 * 1024);

        // Set the producer acks level
        configProps.put(ProducerConfig.ACKS_CONFIG, "all");

        // Set the producer maximum retries
        configProps.put(ProducerConfig.RETRIES_CONFIG, 3);

        // Set the retry interval
        configProps.put(ProducerConfig.RETRY_BACKOFF_MS_CONFIG, 1000);

        //Set idempotence to avoid duplicates
        configProps.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);

        // Log the configuration properties
        log.debug("Creating Kafka producer factory with configuration properties: {}", configProps);

        // Create and return the Kafka producer factory
        return new DefaultKafkaProducerFactory<>(configProps);
    }

    /**
     * Creates and configures a KafkaTemplate for sending messages to Kafka topics. This method uses
     * the producerFactory to create a new KafkaTemplate instance. The KafkaTemplate provides a
     * high-level abstraction for sending messages to Kafka topics.
     *
     * @return A configured KafkaTemplate<String, String> instance ready for use in the application.
     *     The returned template uses String for both key and value types, suitable for sending
     *     string-based messages to Kafka topics.
     */
    @Bean
    public KafkaTemplate<String, String> kafkaTemplate() {
        final KafkaTemplate<String, String> kafkaTemplate = new KafkaTemplate<>(producerFactory());
        log.debug("KafkaTemplate created using ProducerFactory: {}", producerFactory().getClass().getName());
        return kafkaTemplate;
    }
}
