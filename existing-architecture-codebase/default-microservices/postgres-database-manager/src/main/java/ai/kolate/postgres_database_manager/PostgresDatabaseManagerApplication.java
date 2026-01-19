package ai.kolate.postgres_database_manager;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@EnableFeignClients
@EnableCaching
@EnableJpaRepositories
public class PostgresDatabaseManagerApplication {

	public static void main(String[] args) {
		SpringApplication.run(PostgresDatabaseManagerApplication.class, args);
	}

}
