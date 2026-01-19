package ai.kolate.auth_manager.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.RequestEntity;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientManager;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientProvider;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientProviderBuilder;
import org.springframework.security.oauth2.client.endpoint.DefaultClientCredentialsTokenResponseClient;
import org.springframework.security.oauth2.client.endpoint.OAuth2AccessTokenResponseClient;
import org.springframework.security.oauth2.client.endpoint.OAuth2ClientCredentialsGrantRequest;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizedClientManager;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizedClientRepository;
import org.springframework.security.oauth2.client.web.reactive.function.client.ServletOAuth2AuthorizedClientExchangeFilterFunction;
import org.springframework.security.oauth2.core.endpoint.OAuth2ParameterNames;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.client.WebClient;

import java.net.URI;

@Configuration
@RequiredArgsConstructor
public class OAuth2ClientConfig {

    private final ValueConfig valueConfig;

    // ✅ Custom Token Client (even though deprecated) — safe for Servlet usage
    @Bean
    public OAuth2AccessTokenResponseClient<OAuth2ClientCredentialsGrantRequest> auth0AccessTokenResponseClient() {
        DefaultClientCredentialsTokenResponseClient client = new DefaultClientCredentialsTokenResponseClient();

        client.setRequestEntityConverter(request -> {
            var registration = request.getClientRegistration();

            MultiValueMap<String, String> formParams = new LinkedMultiValueMap<>();
            formParams.add(OAuth2ParameterNames.GRANT_TYPE, "client_credentials");
            formParams.add(OAuth2ParameterNames.CLIENT_ID, registration.getClientId());
            formParams.add(OAuth2ParameterNames.CLIENT_SECRET, registration.getClientSecret());
            formParams.add("audience", valueConfig.getAuth0MgmtAudience());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            return new RequestEntity<>(formParams, headers, HttpMethod.POST,
                    URI.create(registration.getProviderDetails().getTokenUri()));
        });

        return client;
    }

    @Bean
    public OAuth2AuthorizedClientManager authorizedClientManager(
            ClientRegistrationRepository clientRegistrationRepository,
            OAuth2AuthorizedClientRepository authorizedClientRepository,
            OAuth2AccessTokenResponseClient<OAuth2ClientCredentialsGrantRequest> auth0AccessTokenResponseClient) {

        OAuth2AuthorizedClientProvider authorizedClientProvider =
                OAuth2AuthorizedClientProviderBuilder.builder()
                        .clientCredentials(configurer -> configurer
                                .accessTokenResponseClient(auth0AccessTokenResponseClient))
                        .build();

        DefaultOAuth2AuthorizedClientManager authorizedClientManager =
                new DefaultOAuth2AuthorizedClientManager(
                        clientRegistrationRepository, authorizedClientRepository);
        authorizedClientManager.setAuthorizedClientProvider(authorizedClientProvider);

        return authorizedClientManager;
    }

    @Bean
    public WebClient webClient(OAuth2AuthorizedClientManager authorizedClientManager) {
        ServletOAuth2AuthorizedClientExchangeFilterFunction oauth2 =
                new ServletOAuth2AuthorizedClientExchangeFilterFunction(authorizedClientManager);
        oauth2.setDefaultClientRegistrationId("auth0-mgmt");

        return WebClient.builder()
                .apply(oauth2.oauth2Configuration())
                .build();
    }
}



