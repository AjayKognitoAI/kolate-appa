package ai.kolate.user_manager.client;

import ai.kolate.user_manager.dto.kafka.PublishMessageRequest;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "${feign.clients.message-publisher.name}",
        path = "${feign.clients.message-publisher.path}")
public interface MessagePublisherClient {

    /**
     * Publishes a message to a Kafka topic.
     *
     * @param request The publish message request
     * @return Boolean indicating success/failure
     */
    @PostMapping(
            path = "/v1/publish",
            consumes = "application/json",
            produces = "application/json"
    )
    ResponseEntity<?> publishMessage(@RequestBody PublishMessageRequest request);
}
