#!/bin/bash

projectName=$(grep 'rootProject.name' settings.gradle | cut -d "=" -f2 | sed "s/'\|\ //g")
version=$(egrep 'version(\s+)=' build.gradle  | cut -d "=" -f2 | sed "s/'\|\ //g")


echo "Building ${projectName}"
docker build -t kolate/"${projectName}" .

echo "Starting ${projectName}"
docker rm "${projectName}"
docker run -it --name "${projectName}" -p 9035:9035 --restart unless-stopped --network kolatenw -e SPRING_PROFILES_ACTIVE=dev -e DOCKER_ENV=dev  kolate/"${projectName}":latest
