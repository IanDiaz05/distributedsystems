variable "cluster_name" {
  description = "Cluster / Minikube profile name and kubeconfig context."
  type        = string
}

variable "cluster_provider" {
  description = "Cluster runtime. Use minikube for local dev and k3s for prod topology."
  type        = string

  validation {
    condition     = contains(["minikube", "k3s"], var.cluster_provider)
    error_message = "cluster_provider must be \"minikube\" or \"k3s\"."
  }
}

variable "node_count" {
  description = "Number of nodes in the cluster topology."
  type        = number
}

variable "node_cpus" {
  description = "vCPU count allocated to each node."
  type        = number
}

variable "node_memory_mb" {
  description = "Memory in MiB allocated to each node."
  type        = number
}

variable "topology_zones" {
  description = "Failure-domain zone labels applied across nodes."
  type        = list(string)
  default     = ["zone-a", "zone-b", "zone-c"]
}
