package ai.kolate.enterprise_manager.listener;

import ai.kolate.enterprise_manager.dto.datasource.EnterpriseDatasourceRequestDto;
import ai.kolate.enterprise_manager.dto.datasource.EnterpriseDatasourceResponseDto;
import ai.kolate.enterprise_manager.dto.listener.DataSourceProvisionedDTO;
import ai.kolate.enterprise_manager.service.EnterpriseDatasourceService;
import com.fasterxml.jackson.core.JsonProcessingException;
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

@Slf4j
@Component
@RequiredArgsConstructor
public class TerraformProvisionListener {

    private final ObjectMapper objectMapper;
    private final TaskExecutor taskExecutor;
    private final EnterpriseDatasourceService enterpriseDatasourceService;

    @KafkaListener(
            topics = "ai.kolate.terraform.provision-infra-completed",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void consumeDataSourceDetails(
            @Payload String message,
            @Header(value = KafkaHeaders.RECEIVED_KEY, required = false) String key,
            @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            @Header(KafkaHeaders.RECEIVED_TIMESTAMP) long timestamp,
            Acknowledgment acknowledgment
    ) {
        log.info("Received datasource details: topic={}, key={}, partition={}, timestamp={}, message={}",
                topic, key, partition, timestamp, message);

        CompletableFuture.runAsync(() -> {
            try {
                EnterpriseDatasourceRequestDto requestDto = parseRequest(message);
                EnterpriseDatasourceResponseDto datasource = enterpriseDatasourceService.createDatasource(requestDto);

                // Log success
                log.info("Datasource created successfully: {}", datasource);

                // Acknowledge only if everything succeeded
                acknowledgment.acknowledge();

            } catch (Exception ex) {
                log.error("Error processing datasource provisioning message: {}", ex.getMessage(), ex);
                // Optionally: dead-letter the message or handle retry logic
            }
        }, taskExecutor);
    }

    private EnterpriseDatasourceRequestDto parseRequest(String message) {
        try {
            DataSourceProvisionedDTO dto = objectMapper.readValue(message, DataSourceProvisionedDTO.class);
            return EnterpriseDatasourceRequestDto.builder()
                    .organizationId(dto.getId())
                    .dbType(dto.getType())
                    .datasourceUrl(dto.getUrl())
                    .datasourceUsername(dto.getUser())
                    .datasourcePassword(dto.getPassword())
                    .datasourceSchema(dto.getSchema())
                    .build();
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to parse DataSourceProvisionedDTO", e);
        }
    }
}
