package ai.kolate.message_publisher.exception;

import java.io.Serial;

public class InvalidRequestException extends RuntimeException {

    /**
     * Default serial version UID.
     */
    @Serial
    private static final long serialVersionUID = -7539521896555507049L;

    /**
     * Constructor with a message.
     *
     * @param message The error message.
     */
    public InvalidRequestException(String message) {
        super(message);
    }
}
