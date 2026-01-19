package ai.kolate.enterprise_manager.listener;

import ai.kolate.enterprise_manager.dto.admin.AdminDTO;
import ai.kolate.enterprise_manager.dto.listener.CreateInvitedAdminRequestDTO;
import ai.kolate.enterprise_manager.dto.listener.DeleteAdminRequestDTO;
import ai.kolate.enterprise_manager.dto.listener.UpdateAdminRequestDTO;
import ai.kolate.enterprise_manager.exception.BadRequestException;
import ai.kolate.enterprise_manager.service.AdminService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang.StringUtils;
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
public class AdminListener {

    private final ObjectMapper objectMapper;
    private final AdminService adminService;
    private final TaskExecutor taskExecutor;

    @KafkaListener(
            topics = "ai.kolate.enterprise-admin.create",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void consumeCreateInvitedAdminMessage(
            @Payload String message,
            @Header(value = KafkaHeaders.RECEIVED_KEY, required = false) String key,
            @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            @Header(KafkaHeaders.RECEIVED_TIMESTAMP) long timestamp,
            Acknowledgment acknowledgment
    ) {
        log.info("Received admin creation request: topic={}, key={}, partition={}, timestamp={}, message={}",
                topic, key, partition, timestamp, message);

        CompletableFuture
                .supplyAsync(() -> parseRequest(message, CreateInvitedAdminRequestDTO.class), taskExecutor)
                .thenApply(requestDTO -> {
                    log.debug("Parsed request DTO: {}", requestDTO);
                    return adminService.createAdminByOrganizationId(requestDTO);
                })
                .thenAccept(adminDTO -> {
                    if (adminDTO != null) {
                        acknowledgment.acknowledge();
                        log.info("Admin created successfully and message acknowledged.");
                    } else {
                        log.warn("Admin creation returned null. Message will not be acknowledged.");
                    }
                })
                .exceptionally(ex -> {
                    log.error("Failed to process admin creation request asynchronously: {}", ex.getMessage(), ex);
                    return null;
                });
    }

    @KafkaListener(
            topics = "ai.kolate.enterprise-admin.update",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void consumeUpdateAdminMessage(
            @Payload String message,
            @Header(value = KafkaHeaders.RECEIVED_KEY, required = false) String key,
            @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            @Header(KafkaHeaders.RECEIVED_TIMESTAMP) long timestamp,
            Acknowledgment acknowledgment
    ) {
        log.info("Received admin update request: topic={}, key={}, partition={}, timestamp={}, message={}",
                topic, key, partition, timestamp, message);

        CompletableFuture
                .supplyAsync(() -> parseRequest(message, UpdateAdminRequestDTO.class), taskExecutor)
                .thenApply(requestDTO -> {
                    log.debug("Parsed request DTO: {}", requestDTO);
                    return adminService.updateAdminByEmail(requestDTO);
                })
                .thenAccept(adminDTO -> {
                    if (adminDTO != null) {
                        acknowledgment.acknowledge();
                        log.info("Admin updated successfully and message acknowledged.");
                    } else {
                        log.warn("Admin updation returned null. Message will not be acknowledged.");
                    }
                })
                .exceptionally(ex -> {
                    log.error("Failed to process admin updation request asynchronously: {}", ex.getMessage(), ex);
                    return null;
                });
    }

    @KafkaListener(
            topics = "ai.kolate.enterprise-admin.delete",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void consumeDeleteAdminMessage(
            @Payload String message,
            @Header(value = KafkaHeaders.RECEIVED_KEY, required = false) String key,
            @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            @Header(KafkaHeaders.RECEIVED_TIMESTAMP) long timestamp,
            Acknowledgment acknowledgment
    ) {
        log.info("Received admin delete request: topic={}, key={}, partition={}, timestamp={}, message={}",
                topic, key, partition, timestamp, message);

        CompletableFuture
                .supplyAsync(() -> parseRequest(message, DeleteAdminRequestDTO.class), taskExecutor)
                .thenApply(requestDTO -> {
                    if (requestDTO == null || StringUtils.isBlank(requestDTO.getAdminEmail())) {
                        throw new IllegalArgumentException("Invalid DeleteAdminRequestDTO: missing adminEmail.");
                    }
                    log.debug("Parsed DeleteAdminRequestDTO: {}", requestDTO);
                    return adminService.deleteAdminByEmail(requestDTO.getAdminEmail());
                })
                .thenAccept(deleted -> {
                    if (deleted) {
                        log.info("Admin deleted successfully for email. Acknowledging message.");
                    } else {
                        log.warn("No admin found for deletion. Acknowledging anyway to avoid reprocessing.");
                    }
                    acknowledgment.acknowledge();
                })
                .exceptionally(ex -> {
                    log.error("Failed to process admin delete request: {}", ex.getMessage(), ex);
                    // Do not acknowledge on error — Kafka will retry depending on config
                    return null;
                });
    }

    private <T> T parseRequest(String message, Class<T> modelClass) {
        try {
            return objectMapper.readValue(message, modelClass);
        } catch (Exception ex) {
            log.error("Failed to parse request: {}", message, ex);
            throw new BadRequestException("Invalid request format", ex);
        }
    }
}

