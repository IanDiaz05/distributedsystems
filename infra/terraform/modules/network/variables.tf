variable "environment" {
  description = "Deployment environment name applied as a namespace label."
  type        = string
}

variable "namespace_names" {
  description = "Logical namespaces that separate platform tiers."
  type        = list(string)
  default = [
    "platform-system",
    "data-tier",
    "messaging",
    "store-apps",
    "observability",
    "security",
  ]
}

variable "pod_cidr" {
  description = "Cluster pod network CIDR metadata (informational for later CNI/MetalLB work)."
  type        = string
  default     = "10.244.0.0/16"
}

variable "service_cidr" {
  description = "Cluster service network CIDR metadata."
  type        = string
  default     = "10.96.0.0/12"
}

variable "metallb_pool_range" {
  description = "MetalLB address pool range metadata for LoadBalancer Services."
  type        = string
  default     = "192.168.49.80-192.168.49.90"
}
