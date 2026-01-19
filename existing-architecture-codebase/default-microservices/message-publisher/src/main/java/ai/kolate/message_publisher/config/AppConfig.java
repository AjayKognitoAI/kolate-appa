package ai.kolate.message_publisher.config;

import com.google.gson.Gson;
import lombok.Getter;
import org.springframework.beans.factory.config.ServiceLocatorFactoryBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StopWatch;

@Configuration
@Getter
public class AppConfig {

    /**
     * Creates and configures a ServiceLocatorFactoryBean for service factory bean creation. This
     * method sets up a bean factory using the IServiceFactory interface, allowing Spring to manage
     * the bean lifecycle.
     *
     * @return ServiceLocatorFactoryBean A configured instance of ServiceLocatorFactoryBean that uses
     *     IServiceFactory as its service locator interface.
     */
    @Bean
    public ServiceLocatorFactoryBean serviceLocatorFactoryBean() {
        final var factoryBean = new ServiceLocatorFactoryBean();
        factoryBean.setServiceLocatorInterface(IServiceFactory.class);
        return factoryBean;
    }

    @Bean
    public StopWatch stopWatch() {
        return new StopWatch();
    }

    @Bean
    public Gson gson() {
        return new Gson();
    }
}
