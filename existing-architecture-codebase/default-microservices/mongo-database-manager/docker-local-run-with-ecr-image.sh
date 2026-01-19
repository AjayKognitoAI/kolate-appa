#!/bin/bash

projectName=$(grep 'rootProject.name' settings.gradle | cut -d "=" -f2 | sed "s/'\|\ //g")
version=$(egrep 'version(\s+)=' build.gradle  | cut -d "=" -f2 | sed "s/'\|\ //g")

aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin 767397887751.dkr.ecr.us-west-2.amazonaws.com

docker pull 767397887751.dkr.ecr.us-west-2.amazonaws.com/kolateai/${projectName}:dev

docker rm -f ${projectName}
docker run -d --name ${projectName} -p 9050:9050 --restart unless-stopped --network kolatenw -e SPRING_PROFILES_ACTIVE=dev -e DOCKER_ENV=dev -e SERVICE_NAME=${projectName} kolate/${projectName}:latest
docker logs -f ${projectName}