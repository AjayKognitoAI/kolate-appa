FROM gradle:8.13.0-jdk21 AS build
ENV DOCKER_ENV=dev
COPY --chown=gradle:gradle . /home/gradle/src
WORKDIR /home/gradle/src
RUN gradle clean build --no-daemon

FROM amazoncorretto:21-alpine-jdk
RUN apk update && apk add curl
ENV SERVICE_NAME project-manager
RUN mkdir -p /apps/kolateai/components/${SERVICE_NAME}
RUN mkdir -p /apps/kolateai/logs/components/${SERVICE_NAME}
COPY --from=build /home/gradle/src/build/libs/*.jar /apps/kolateai/components/${SERVICE_NAME}/${SERVICE_NAME}.jar
EXPOSE 9035
ENTRYPOINT java -XX:+UnlockExperimentalVMOptions -Dspring.profiles.active=$DOCKER_ENV -Djava.security.egd=file:/dev/./urandom -jar /apps/kolateai/components/${SERVICE_NAME}/${SERVICE_NAME}.jar