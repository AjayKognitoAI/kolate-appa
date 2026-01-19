terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

provider "docker" {}

# resource "docker_network" "kolate_network" {
#   name = var.network_name
# }

# Create volumes per database type
resource "docker_volume" "postgres_volume" {
  count = var.database_type == "postgres" ? 1 : 0
  name  = var.volume_name
}

resource "docker_volume" "mongodb_volume" {
  count = var.database_type == "mongodb" ? 1 : 0
  name  = var.volume_name
}

resource "docker_volume" "redis_volume" {
  count = var.database_type == "redis" ? 1 : 0
  name  = var.volume_name
}

locals {
  image = {
    postgres = "postgres:14"
    mongodb  = "mongo:6.0"
    redis    = "redis:7.2"
  }[var.database_type]

  internal_port = {
    postgres = 5432
    mongodb  = 27017
    redis    = 6379
  }[var.database_type]

  mount_path = {
    postgres = "/var/lib/postgresql/data"
    mongodb  = "/data/db"
    redis    = "/data"
  }[var.database_type]

  env_vars = var.database_type == "postgres" ? [
    "POSTGRES_DB=${var.db_name}",
    "POSTGRES_USER=${var.db_user}",
    "POSTGRES_PASSWORD=${var.db_password}"
  ] : var.database_type == "mongodb" ? [
    "MONGO_INITDB_DATABASE=${var.db_name}",
    "MONGO_INITDB_ROOT_USERNAME=${var.db_user}",
    "MONGO_INITDB_ROOT_PASSWORD=${var.db_password}"
  ] : []
}

resource "docker_image" "db_image" {
  name = local.image
}

resource "docker_container" "db_container" {
  name  = var.container_name
  image = docker_image.db_image.name

  networks_advanced {
    name = var.network_name
  }

  ports {
    internal = local.internal_port
    external = var.host_port
  }

  volumes {
    container_path = local.mount_path
    volume_name = (
      var.database_type == "postgres" ? docker_volume.postgres_volume[0].name :
        var.database_type == "mongodb" ? docker_volume.mongodb_volume[0].name :
        docker_volume.redis_volume[0].name
    )
  }

  env = local.env_vars

  restart = "unless-stopped"
}
