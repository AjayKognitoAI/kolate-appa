#!/bin/bash

projectName=$(grep 'rootProject.name' settings.gradle | cut -d "=" -f2 | sed "s/'\|\ //g")
version=$(egrep 'version(\s+)=' build.gradle  | cut -d "=" -f2 | sed "s/'\|\ //g")

echo "Building ${projectName}"
docker build -t kolate/${projectName} .
