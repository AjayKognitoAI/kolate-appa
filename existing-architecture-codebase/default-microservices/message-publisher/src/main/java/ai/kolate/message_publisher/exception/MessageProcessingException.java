package ai.kolate.message_publisher.exception;

import java.io.Serial;

public class MessageProcessingException extends RuntimeException {

    /**
     * Default serial version UID.
     */
    @Serial
    private static final long serialVersionUID = -7539421896555507049L;

    /**
     * Constructor with a message.
     *
     * @param message
     */
    public MessageProcessingException(String message) {
        super(message);
    }
}
