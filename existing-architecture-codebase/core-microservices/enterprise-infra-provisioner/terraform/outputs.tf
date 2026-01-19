output "container_name" {
  value = docker_container.db_container.name
}

output "host_port" {
  value = var.host_port
}

output "database_type" {
  value = var.database_type
}
