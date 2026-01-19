package ai.kolate.api_gateway.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cloud.client.ServiceInstance;
import org.springframework.cloud.client.discovery.DiscoveryClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/health")
@Slf4j
public class HealthCheckController {
    @Autowired
    private DiscoveryClient discoveryClient;

    @Autowired private WebClient.Builder webClientBuilder;


    @GetMapping("/{serviceId}")
    public Mono<ResponseEntity<Object>> getServiceHealth(@PathVariable String serviceId) {
        return Mono.just(serviceId)
                .flatMap(
                        service -> {
                            List<ServiceInstance> instances = discoveryClient.getInstances(service);
                            if (instances.isEmpty()) {
                                return Mono.just(
                                        ResponseEntity.status(503)
                                                .body(
                                                        Map.of(
                                                                "status",
                                                                "DOWN",
                                                                "error",
                                                                "Service not found in registry",
                                                                "service",
                                                                service)));
                            }

                            ServiceInstance instance = instances.getFirst();
                            return webClientBuilder
                                    //                            .filter(lbFunction)
                                    .build()
                                    .get()
                                    .uri(
                                            String.format(
                                                    "http://%s:%d/actuator/health", instance.getHost(), instance.getPort()))
                                    .retrieve()
                                    .bodyToMono(Object.class)
                                    .map(ResponseEntity::ok)
                                    .onErrorResume(
                                            e ->
                                                    Mono.just(
                                                            ResponseEntity.status(503)
                                                                    .body(
                                                                            Map.of(
                                                                                    "status",
                                                                                    "DOWN",
                                                                                    "error",
                                                                                    e.getMessage(),
                                                                                    "service",
                                                                                    service))));
                        });
    }

    @GetMapping("/all")
    public Mono<Map<String, Object>> checkServicesHealth() {
        Map<String, Object> serviceHealth = new ConcurrentHashMap<>();
        List<String> serviceIds = discoveryClient.getServices();

        return Flux.fromIterable(serviceIds)
                .flatMap(
                        serviceId -> {
                            List<ServiceInstance> instances = discoveryClient.getInstances(serviceId);
                            if (!instances.isEmpty()) {
                                ServiceInstance instance = instances.getFirst();
                                String healthUrl = instance.getUri() + "/actuator/health";

                                return webClientBuilder
                                        .build()
                                        .get()
                                        .uri(healthUrl)
                                        .retrieve()
                                        .bodyToMono(Map.class)
                                        .map(
                                                response -> {
                                                    serviceHealth.put(serviceId, response);
                                                    return serviceHealth;
                                                })
                                        .onErrorResume(
                                                error -> {
                                                    serviceHealth.put(
                                                            serviceId,
                                                            Map.of("status", "DOWN", "groups", List.of("liveness", "readiness")));
                                                    return Mono.just(serviceHealth);
                                                });
                            }
                            return Mono.just(serviceHealth);
                        })
                .last()
                .defaultIfEmpty(new ConcurrentHashMap<>());
    }
}
