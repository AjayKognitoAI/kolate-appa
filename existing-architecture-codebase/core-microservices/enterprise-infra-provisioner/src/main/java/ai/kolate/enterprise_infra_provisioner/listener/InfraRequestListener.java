package ai.kolate.enterprise_infra_provisioner.listener;

import ai.kolate.enterprise_infra_provisioner.dto.DataSourceDTO;
import ai.kolate.enterprise_infra_provisioner.exception.RequestParseException;
import ai.kolate.enterprise_infra_provisioner.service.TerraformService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.task.TaskExecutor;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

import java.util.concurrent.CompletableFuture;

@Component
@Slf4j
@RequiredArgsConstructor
public class InfraRequestListener {

    private final TaskExecutor taskExecutor;
    private final ObjectMapper objectMapper;
    private final TerraformService terraformService;

    @KafkaListener(
            topics = "ai.kolate.terraform.provision-infra",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void consumeInfraProvisionRequest(
            @Payload String message,
            @Header(value = KafkaHeaders.RECEIVED_KEY, required = false) String key,
            @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            @Header(KafkaHeaders.RECEIVED_TIMESTAMP) long timestamp,
            Acknowledgment acknowledgment
    ) {
        log.info("Received infra provision request: topic={}, message={} ,partition={}, timestamp={}",
                topic, message, partition, timestamp);

        try {
            // Parse and validate the request
            final DataSourceDTO request = parseRequest(message);
            // Process the request asynchronously
            CompletableFuture.runAsync(() -> {
                try {
                    terraformService.provisionAllDatabases(request);
                    acknowledgment.acknowledge();
                } catch (Exception ex) {
                    log.error("Failed to provision infra: {}", ex.getMessage(), ex);
                }
            }, taskExecutor).exceptionally(ex -> {
                log.error("Provisioning failed: {}", ex.getMessage(), ex);
                throw new RuntimeException("Provisioning failed", ex);  // Must throw to trigger error handler
            });

        } catch (Exception ex) {
            log.error("Error processing provision request: {}", ex.getMessage(), ex);
        }
    }

    private DataSourceDTO parseRequest(String message) {
        try {
            return objectMapper.readValue(message, DataSourceDTO.class);
        } catch (Exception ex) {
            log.error("Failed to parse message: {}", message, ex); // log full message and stacktrace
            throw new RequestParseException("Invalid provision request format", ex);
        }
    }
}
