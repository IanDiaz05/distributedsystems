variable "environment" {
  description = "Deployment environment name applied as a StorageClass label."
  type        = string
}

variable "storage_class_name" {
  description = "Name of the StorageClass used by stateful store workloads."
  type        = string
  default     = "store-replicated"
}

variable "storage_provisioner" {
  description = "CSI/in-tree provisioner (minikube-hostpath in dev, Longhorn in prod)."
  type        = string
}
