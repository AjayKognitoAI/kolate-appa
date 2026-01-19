#!/bin/bash

projectName=$(grep 'rootProject.name' settings.gradle | cut -d "=" -f2 | sed "s/'\|\ //g")
version=$(egrep 'version(\s+)=' build.gradle  | cut -d "=" -f2 | sed "s/'\|\ //g")
docker rm -f ${projectName}
docker run -d --name ${projectName} -p 9000:9000 --restart unless-stopped --network kolatenw -e SPRING_PROFILES_ACTIVE=dev -e DOCKER_ENV=dev  kolate/${projectName}:latest
docker logs -f ${projectName}