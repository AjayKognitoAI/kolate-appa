package ai.kolate.message_publisher.config;

import ai.kolate.message_publisher.service.KafkaProducer;
import ai.kolate.message_publisher.service.MessagePublisher;
import ai.kolate.message_publisher.service.Validator;
import com.google.gson.Gson;
import org.springframework.util.StopWatch;

public interface IServiceFactory {
    Gson getGson();
    KafkaProducer getKafkaProducer();
    MessagePublisher getMessagePublisher();
    Validator getValidator();
    StopWatch getStopWatch();
}
