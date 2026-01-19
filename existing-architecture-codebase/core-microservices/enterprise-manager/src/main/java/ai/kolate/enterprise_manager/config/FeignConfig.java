package ai.kolate.enterprise_manager.config;

import feign.codec.ErrorDecoder;
import org.springframework.boot.autoconfigure.http.HttpMessageConverters;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableFeignClients(basePackages = "ai.kolate.enterprise_manager.client")
public class FeignConfig {
    
    /**
     * Creates a custom error decoder for Feign clients.
     *
     * @return The custom error decoder
     */
    @Bean
    public ErrorDecoder errorDecoder() {
        return new CustomFeignErrorDecoder();
    }

//    @Bean
//    public HttpMessageConverters messageConverters() {
//        return new HttpMessageConverters();
//    }
}
