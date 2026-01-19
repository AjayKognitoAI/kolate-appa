package ai.kolate.api_gateway.config;

import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.timelimiter.TimeLimiterConfig;
import org.springframework.cloud.circuitbreaker.resilience4j.ReactiveResilience4JCircuitBreakerFactory;
import org.springframework.cloud.circuitbreaker.resilience4j.Resilience4JConfigBuilder;
import org.springframework.cloud.client.circuitbreaker.Customizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
public class CircuitBreakerConfig {

    @Bean
    public Customizer<ReactiveResilience4JCircuitBreakerFactory> defaultCustomizer() {
        return factory -> factory.configureDefault(id -> new Resilience4JConfigBuilder(id)
                .circuitBreakerConfig(io.github.resilience4j.circuitbreaker.CircuitBreakerConfig.custom()
                        .slidingWindowSize(10)                 // Number of calls used to calculate error rate
                        .failureRateThreshold(50)              // Percentage of failures to trip circuit
                        .waitDurationInOpenState(Duration.ofSeconds(10)) // Time circuit stays open before half-open
                        .permittedNumberOfCallsInHalfOpenState(5)        // Calls allowed in half-open state
                        .slowCallRateThreshold(50)             // Percentage of slow calls to trip circuit
                        .slowCallDurationThreshold(Duration.ofSeconds(2)) // What's considered a slow call
                        .build())
                .timeLimiterConfig(TimeLimiterConfig.custom()
                        .timeoutDuration(Duration.ofSeconds(3)) // Timeout for calls
                        .build())
                .build());
    }
}
