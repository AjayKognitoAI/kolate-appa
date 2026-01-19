# Stage 1: Build the Spring Boot application
FROM gradle:8.13.0-jdk21 AS build
ENV DOCKER_ENV=dev
COPY --chown=gradle:gradle . /home/gradle/src
WORKDIR /home/gradle/src
RUN gradle clean build --no-daemon

# Stage 2: Final lightweight image with Terraform and the app
FROM amazoncorretto:21-alpine-jdk

# Install required packages and Terraform for ARM64
RUN apk update && \
    apk add --no-cache curl unzip bash

# Install Terraform (ARM64 version)
ENV TERRAFORM_VERSION=1.6.6
RUN curl -fsSL https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_arm64.zip -o terraform.zip && \
    unzip terraform.zip && \
    mv terraform /usr/local/bin/terraform && \
    terraform -version && \
    rm -f terraform.zip

# Set environment
ENV SERVICE_NAME=enterprise-infra-provisioner

# Create required directories
RUN mkdir -p /apps/kolateai/components/${SERVICE_NAME} \
    && mkdir -p /apps/kolateai/logs/components/${SERVICE_NAME}

# Copy the built Spring Boot JAR
COPY --from=build /home/gradle/src/build/libs/*.jar /apps/kolateai/components/${SERVICE_NAME}/${SERVICE_NAME}.jar

# Copy Terraform templates (this is the key fix)
COPY terraform /apps/kolateai/components/${SERVICE_NAME}/terraform

# Set working directory
WORKDIR /apps/kolateai/components/${SERVICE_NAME}

# Expose application port
EXPOSE 9090

# Run the Spring Boot application
ENTRYPOINT java -XX:+UnlockExperimentalVMOptions -Dspring.profiles.active=$DOCKER_ENV -Djava.security.egd=file:/dev/./urandom -jar /apps/kolateai/components/${SERVICE_NAME}/${SERVICE_NAME}.jar
