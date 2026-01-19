package ai.kolate.api_gateway.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ServerWebExchange;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/fallback")
@Slf4j
public class FallbackController {

    @GetMapping("/default")
    public ResponseEntity<Map<String, String>> defaultFallback(ServerWebExchange exchange) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();
        String originalPath = exchange.getAttribute("originalPath");
        String serviceId = exchange.getAttribute("serviceId");
        
        log.error("Circuit breaker triggered - Default fallback for request: {}, original path: {}, service: {}", 
                 path, originalPath, serviceId);
        
        Map<String, String> response = new HashMap<>();
        response.put("status", "error");
        response.put("message", "Service is temporarily unavailable. Please try again later.");
        
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(response);
    }

    @GetMapping("/enterprise-manager")
    public ResponseEntity<Map<String, String>> userServiceFallback(ServerWebExchange exchange) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();
        String originalPath = exchange.getAttribute("originalPath");
        
        log.error("Circuit breaker triggered - Enterprise Manager fallback for request: {}, original path: {}",
                 path, originalPath);
        
        Map<String, String> response = new HashMap<>();
        response.put("status", "error");
        response.put("service", "enterprise-manager");
        response.put("message", "Enterprise Manager is temporarily unavailable. Please try again later.");
        
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(response);
    }
}