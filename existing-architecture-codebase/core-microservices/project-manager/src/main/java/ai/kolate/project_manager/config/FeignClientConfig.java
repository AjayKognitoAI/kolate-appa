package ai.kolate.project_manager.config;

import feign.RequestInterceptor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;

@Configuration
public class FeignClientConfig {

    private static final String ORG_ID_HEADER = "org-id";
    private static final String USER_ID_HEADER = "user-id";

    @Bean
    public RequestInterceptor requestInterceptor() {
        return requestTemplate -> {
            ServletRequestAttributes requestAttributes =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();

            if (requestAttributes != null) {
                HttpServletRequest request = requestAttributes.getRequest();

                String orgId = request.getHeader(ORG_ID_HEADER);
                String userId = request.getHeader(USER_ID_HEADER);

                if (orgId != null && !orgId.isEmpty()) {
                    requestTemplate.header(ORG_ID_HEADER, orgId);
                }

                if (userId != null && !userId.isEmpty()) {
                    requestTemplate.header(USER_ID_HEADER, userId);
                }
            }
        };
    }
}
