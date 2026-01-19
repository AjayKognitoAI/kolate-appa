FROM gradle:8.13.0-jdk21 AS build
ENV DOCKER_ENV=dev
COPY --chown=gradle:gradle . /home/gradle/src
WORKDIR /home/gradle/src
RUN gradle clean build --no-daemon

FROM amazoncorretto:21-alpine-jdk
RUN apk update && apk add curl
ENV SERVICE_NAME config-server
RUN mkdir -p /apps/kolate/components/${SERVICE_NAME} /apps/kolate/components/${SERVICE_NAME}/keys /apps/kolate/logs/components/${SERVICE_NAME}
COPY --from=build /home/gradle/src/build/libs/${SERVICE_NAME}*.jar /apps/kolate/components/${SERVICE_NAME}/${SERVICE_NAME}.jar
# Copy the certificates
#ENV VAULT_KEY=keys/vault_ca.pem
#COPY ${VAULT_KEY} /apps/kolate/components/${SERVICE_NAME}/keys/vault_ca.pem
#RUN keytool -import -file /apps/kolate/components/${SERVICE_NAME}/keys/vault_ca.pem -alias vault-ca -cacerts -storepass changeit -noprompt
EXPOSE 8888
ENTRYPOINT java -XX:+UnlockExperimentalVMOptions -Dspring.profiles.active=${DOCKER_ENV} -Djava.security.egd=file:/dev/./urandom -jar /apps/kolate/components/${SERVICE_NAME}/${SERVICE_NAME}.jar
