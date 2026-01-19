package ai.kolate.message_publisher.exception;

import java.io.Serial;

public class InvalidDataException extends Exception {

    /** Default serial version UID. */
    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * Constructor with a message.
     *
     * @param message The error message.
     */
    public InvalidDataException(String message) {
        super(message);
    }
}