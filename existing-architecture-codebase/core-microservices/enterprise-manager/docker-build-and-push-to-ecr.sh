#!/bin/bash

projectName=$(grep 'rootProject.name' settings.gradle | cut -d "=" -f2 | sed "s/'\|\ //g")
version=$(egrep 'version(\s+)=' build.gradle  | cut -d "=" -f2 | sed "s/'\|\ //g")

aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin 767397887751.dkr.ecr.us-west-2.amazonaws.com

docker build --platform linux/arm64 -t kolate/${projectName}:latest .

docker tag kolate/${projectName}:latest 767397887751.dkr.ecr.us-west-2.amazonaws.com/kolateai/${projectName}:latest

docker push 767397887751.dkr.ecr.us-west-2.amazonaws.com/kolateai/${projectName}:latest
docker push 767397887751.dkr.ecr.us-west-2.amazonaws.com/kolateai/${projectName}:${version}
