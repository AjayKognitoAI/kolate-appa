variable "container_name" {
  type = string
}

variable "db_name" {
  type = string
  default = ""
}

variable "db_user" {
  type = string
  default = ""
}

variable "db_password" {
  type = string
  default = ""
}

variable "volume_name" {
  type = string
}

variable "network_name" {
  type = string
  default = "kolatenw"
}

variable "host_port" {
  type = number
}

variable "database_type" {
  type = string
  description = "One of: postgres, mongodb, redis"
}
