package ai.kolate.message_publisher.controller;

import ai.kolate.message_publisher.config.IServiceFactory;
import ai.kolate.message_publisher.dto.PublishMessageRequest;
import ai.kolate.message_publisher.dto.PublishMessageResponse;
import ai.kolate.message_publisher.exception.InvalidRequestException;
import ai.kolate.message_publisher.resource.KafkaTopics;
import ai.kolate.message_publisher.util.Util;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import static ai.kolate.message_publisher.util.Constants.FAILED;
import static ai.kolate.message_publisher.util.Constants.SUCCESS;

@RestController
@Slf4j
public class PublisherController {
    private final IServiceFactory iServiceFactory;

    /**
     * @param iServiceFactory
     */
    public PublisherController(IServiceFactory iServiceFactory) {
        this.iServiceFactory = iServiceFactory;
    }

    /**
     * Publishes a message to a specified Kafka topic.
     *
     * <p>This method handles the HTTP POST request for publishing messages. It validates the input,
     * adds authentication information if necessary, publishes the message to Kafka, and returns the
     * result of the operation.
     *
     * @param publishMessageRequest The request object containing the Kafka topic name and the message
     *     to be published.
     * @param httpServletRequest The HTTP request object, used to extract authentication information.
     * @return A ResponseEntity containing a PublishMessageResponse, which includes the status of the
     *     publish operation and a message. Returns HTTP 200 OK for successful publishes, HTTP 400 BAD
     *     REQUEST for invalid inputs, and HTTP 500 INTERNAL SERVER ERROR for other exceptions.
     */
    @PostMapping(
            path = {"/api/message-publisher/v1/publish", "/public/message-publisher/v1/publish"},
            consumes = "application/json",
            produces = "application/json"
    )
    public ResponseEntity<PublishMessageResponse> publishMessage(
            @Valid @RequestBody PublishMessageRequest publishMessageRequest,
            HttpServletRequest httpServletRequest
    ) {
        var stopwatch = iServiceFactory.getStopWatch();
        stopwatch.start();
        String requestStatus = FAILED;

        try {
            String loginUserAuthId = Util.extractLoginUserId(httpServletRequest);
            log.info("PublishMessageRequest from user [{}]: {}", loginUserAuthId, publishMessageRequest);

            // Optional internal validation if needed beyond annotations
//            iServiceFactory.getValidator().validateRequest(publishMessageRequest);

            // Optional enrichment if necessary
            // enrichRequestIfNeeded(publishMessageRequest, loginUserAuthId);

            iServiceFactory.getMessagePublisher().publishMessage(
                    KafkaTopics.valueOf(publishMessageRequest.getKafkaTopicName()),
                    publishMessageRequest.getMessage()
            );

            requestStatus = SUCCESS;
            return ResponseEntity.ok(new PublishMessageResponse(SUCCESS, "Message published successfully"));

        } catch (InvalidRequestException | IllegalArgumentException e) {
            log.warn("Validation error: {}", e.getMessage());
            return ResponseEntity.badRequest().body(
                    new PublishMessageResponse(FAILED, "%s : %s".formatted(e.getClass().getSimpleName(), e.getMessage()))
            );

        } catch (Exception e) {
            log.error("Unexpected error during message publishing", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                    new PublishMessageResponse(FAILED, "%s : %s".formatted(e.getClass().getSimpleName(), e.getMessage()))
            );

        } finally {
            stopwatch.stop();
            log.info("Request status: {}", requestStatus);
            log.info("Endpoint publishMessage took {} seconds", stopwatch.getTotalTimeSeconds());
        }
    }
}
