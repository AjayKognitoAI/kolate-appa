#!/bin/bash

# Test script to send organization IDs to Kafka topics

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Kafka configuration
KAFKA_CONTAINER="kafka"
PROVISIONING_TOPIC="organization-provisioning"
DEPROVISIONING_TOPIC="organization-deprovisioning"

echo -e "${GREEN}Testing Kafka message sending...${NC}"

# Function to send message to Kafka
send_message() {
    local topic=$1
    local message=$2
    
    echo -e "${YELLOW}Sending message '${message}' to topic '${topic}'...${NC}"
    
    docker exec -it $KAFKA_CONTAINER kafka-console-producer \
        --bootstrap-server localhost:29092 \
        --topic $topic << EOF
$message
EOF
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Message sent successfully${NC}"
    else
        echo -e "${RED}✗ Failed to send message${NC}"
    fi
}

# Create topics if they don't exist
echo -e "${YELLOW}Creating Kafka topics...${NC}"

docker exec -it $KAFKA_CONTAINER kafka-topics \
    --bootstrap-server localhost:29092 \
    --create --if-not-exists \
    --topic $PROVISIONING_TOPIC \
    --partitions 1 \
    --replication-factor 1

docker exec -it $KAFKA_CONTAINER kafka-topics \
    --bootstrap-server localhost:29092 \
    --create --if-not-exists \
    --topic $DEPROVISIONING_TOPIC \
    --partitions 1 \
    --replication-factor 1

echo -e "${GREEN}Topics created successfully${NC}"

# Test organization provisioning
echo -e "\n${GREEN}=== Testing Organization Provisioning ===${NC}"
send_message $PROVISIONING_TOPIC "org_test_001"
send_message $PROVISIONING_TOPIC "org_test_002"

# Wait a bit
sleep 2

# Test organization deprovisioning
echo -e "\n${GREEN}=== Testing Organization Deprovisioning ===${NC}"
send_message $DEPROVISIONING_TOPIC "org_test_001"

echo -e "\n${GREEN}Test completed! Check application logs for processing results.${NC}"
echo -e "${YELLOW}You can view Kafka UI at: http://localhost:8081${NC}"
echo -e "${YELLOW}Application health check: http://localhost:8080/api/health${NC}"
