package ai.kolate.message_publisher.resource;

import lombok.Getter;

import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Getter
public enum KafkaTopics {
    TOPIC_NOTIFICATION_EMAIL("ai.kolate.notification.email"),
    TOPIC_NOTIFICATION_ALL("ai.kolate.notification.all"),
    TOPIC_CREATE_ENTERPRISE_ADMIN("ai.kolate.enterprise-admin.create"),
    TOPIC_UPDATE_ENTERPRISE_ADMIN("ai.kolate.enterprise-admin.update"),
    TOPIC_DELETE_ENTERPRISE_ADMIN("ai.kolate.enterprise-admin.delete"),
    TOPIC_PROVISION_INFRA("ai.kolate.terraform.provision-infra"),
    TOPIC_PROVISION_INFRA_COMPLETED("ai.kolate.terraform.provision-infra-completed"),
    TOPIC_FOO("ai.kolate.foo");

    private final String topicName;

    KafkaTopics(String topicName) {
        this.topicName = topicName;
    }

    /** Immutable map for reverse lookup */
    private static final Map<String, KafkaTopics> TOPIC_LOOKUP =
            Stream.of(values())
                    .collect(Collectors.toUnmodifiableMap(KafkaTopics::getTopicName, e -> e));

    /**
     * Get KafkaTopics enum by topic name.
     *
     * @param topicName The topic string
     * @return KafkaTopics enum constant
     * @throws IllegalArgumentException if topic not found
     */
    public static KafkaTopics get(String topicName) {
        KafkaTopics topic = TOPIC_LOOKUP.get(topicName);
        if (topic == null) {
            throw new IllegalArgumentException("Unknown Kafka topic: " + topicName);
        }
        return topic;
    }

    @Override
    public String toString() {
        return this.topicName;
    }
}
