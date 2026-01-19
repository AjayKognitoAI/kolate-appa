package ai.kolate.enterprise_infra_provisioner.service;

import ai.kolate.enterprise_infra_provisioner.config.AppDataConfig;
import ai.kolate.enterprise_infra_provisioner.dto.DataSourceDTO;
import ai.kolate.enterprise_infra_provisioner.dto.DataSourceProvisionedDTO;
import ai.kolate.enterprise_infra_provisioner.model.PortMapping;
import ai.kolate.enterprise_infra_provisioner.repository.PortMappingRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;

@Service
@Slf4j
@RequiredArgsConstructor
public class TerraformService {

    private final AppDataConfig dataConfig;
    private final ObjectMapper objectMapper;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final PortMappingRepository portMappingRepository;

    private static final Path BASE_TERRAFORM_DIR = Paths.get("terraform");

    public void provisionAllDatabases(DataSourceDTO request) {
        Stream.of("postgres", "mongodb", "redis")
                .parallel()
                .forEach(dbType -> {
                    try {
                        provision(request, dbType);
                    } catch (Exception e) {
                        log.error("Provisioning failed for {}: {}", dbType, e.getMessage());
                    }
                });
    }

    private void provision(DataSourceDTO request, String dbType) {
        String containerName = request.getId() + "_" + dbType;
        Path terraformDir = BASE_TERRAFORM_DIR.resolve(containerName);

        try {
            Files.createDirectories(terraformDir);
            copyTerraformTemplates(terraformDir);

            int staticPort = assignStaticPort(containerName, getBasePort(dbType));

            Files.writeString(
                    terraformDir.resolve("terraform.tfvars"),
                    String.format("""
                            container_name   = \"%s\"
                            db_name          = \"%s\"
                            db_user          = \"%s\"
                            db_password      = \"%s\"
                            volume_name      = \"%s\"
                            network_name     = \"kolatenw\"
                            host_port        = %d
                            database_type    = \"%s\"
                            """,
                            containerName,
                            request.getDatabase(),
                            request.getUser(),
                            request.getPassword(),
                            containerName + "_volume",
                            staticPort,
                            dbType
                    )
            );

            log.info("Starting Terraform provisioning for: {}", dbType);

            runCommand(terraformDir, "terraform init");
            runCommand(terraformDir, "terraform apply -auto-approve");

            sendDatabaseProvisionedMessage(request, dbType, staticPort);

            deleteDirectory(terraformDir);

        } catch (IOException e) {
            log.error("Failed to prepare Terraform directory or write tfvars for {}", dbType, e);
            throw new RuntimeException("Terraform setup failed", e);
        } catch (Exception e) {
            log.error("Failed to provision infra: {}", e.getMessage(), e);
            throw new RuntimeException("Terraform apply failed", e);
        }
    }

    private int getBasePort(String dbType) {
        return switch (dbType) {
            case "postgres" -> 5433;
            case "mongodb"  -> 27018;
            case "redis"    -> 6380;
            default -> throw new IllegalArgumentException("Unknown DB type: " + dbType);
        };
    }

    private void sendDatabaseProvisionedMessage(DataSourceDTO request, String dbType, int port) {
        String url;

        switch (dbType) {
            case "postgres" -> url = String.format(
                    "jdbc:postgresql://%s:%d/%s",
                    dataConfig.getHostAddress(), port, request.getDatabase()
            );

            case "mongodb" -> url = String.format(
                    "mongodb://%s:%s@%s:%d/%s?authSource=admin",
                    request.getUser(), request.getPassword(),
                    dataConfig.getHostAddress(), port,
                    request.getDatabase()
            );

            case "redis"    -> url = String.format("redis://%s:%d",
                    dataConfig.getHostAddress(), port
            );

            default         -> throw new IllegalArgumentException("Unsupported database type: " + dbType);
        }

        DataSourceProvisionedDTO provisionedDTO = DataSourceProvisionedDTO.builder()
                .id(request.getId())
                .type(dbType)
                .url(url)
                .user(request.getUser())
                .password(request.getPassword())
                .schema(request.getSchema())
                .build();

        try {
            String datasourceJson = objectMapper.writeValueAsString(provisionedDTO);
            kafkaTemplate.send("ai.kolate.terraform.provision-infra-completed", datasourceJson);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize provisioned DTO", e);
        }
    }

    private void copyTerraformTemplates(Path destinationDir) throws IOException {
        Path sourceDir = BASE_TERRAFORM_DIR;
        List<String> templateFiles = List.of("main.tf", "variables.tf", "outputs.tf");

        for (String file : templateFiles) {
            Path sourceFile = sourceDir.resolve(file);
            Path targetFile = destinationDir.resolve(file);
            Files.copy(sourceFile, targetFile, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    private synchronized int assignStaticPort(String containerName, int basePort) {
        return portMappingRepository.findById(containerName)
                .map(PortMapping::getPort)
                .orElseGet(() -> {
                    int nextPort = basePort;
                    while (portMappingRepository.findByPort(nextPort).isPresent()) {
                        nextPort++;
                    }
                    portMappingRepository.save(PortMapping.builder()
                            .id(containerName)
                            .port(nextPort)
                            .build());
                    return nextPort;
                });
    }

    private void runCommand(Path dir, String command) throws IOException, InterruptedException {
        log.info("Running command in {}: {}", dir.toAbsolutePath(), command);
        ProcessBuilder builder = new ProcessBuilder(command.split(" "));
        builder.directory(dir.toFile());
        builder.redirectErrorStream(true);
        Process process = builder.start();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            reader.lines().forEach(log::info);
        }

        int exitCode = process.waitFor();
        if (exitCode != 0) {
            throw new RuntimeException("Terraform command failed: " + command);
        }
    }

    private void deleteDirectory(Path directory) {
        try {
            Files.walk(directory)
                    .sorted(Comparator.reverseOrder())
                    .map(Path::toFile)
                    .forEach(File::delete);
            log.info("Deleted Terraform working directory: {}", directory);
        } catch (IOException e) {
            log.warn("Failed to delete Terraform directory: {}", directory, e);
        }
    }
}