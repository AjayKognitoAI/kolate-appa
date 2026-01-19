package ai.kolate.message_publisher.util;

import jakarta.servlet.http.HttpServletRequest;
import lombok.experimental.UtilityClass;

import static ai.kolate.message_publisher.util.Constants.USER_ID;

@UtilityClass
public class Util {

    public String extractLoginUserId(HttpServletRequest request) {
        return request.getHeader(USER_ID);
    }
}
