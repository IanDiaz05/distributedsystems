variable "environment" {
  description = "Environment name (dev or prod)."
  type        = string
}

variable "cluster_name" {
  description = "Cluster name and kubeconfig context."
  type        = string
}

variable "cluster_provider" {
  description = "Cluster runtime: minikube or k3s."
  type        = string
}

variable "node_count" {
  description = "Number of Kubernetes nodes."
  type        = number
}

variable "node_cpus" {
  description = "vCPU count per node."
  type        = number
}

variable "node_memory_mb" {
  description = "Memory in MiB per node."
  type        = number
}

variable "storage_provisioner" {
  description = "StorageClass provisioner for this environment."
  type        = string
}

variable "git_branch" {
  description = "Git branch Flux reconciles."
  type        = string
}

variable "target_path" {
  description = "Flux path relative to the repository root."
  type        = string
}

variable "enable_flux_bootstrap" {
  description = "Create flux_bootstrap_git. Enable after clusters/ is pushed and TF_VAR_github_token is set from GITHUB_TOKEN."
  type        = bool
}

variable "git_repository" {
  description = "HTTPS URL of the GitOps repository."
  type        = string
  default     = "https://github.com/IanDiaz05/distributedsystems.git"
}

variable "github_token" {
  description = "GitHub Personal Access Token used by FluxCD to bootstrap and sync the repository. Prefer -var=\"github_token=$GITHUB_TOKEN\" or TF_VAR_github_token; if left empty, the provider falls back to the GITHUB_TOKEN environment variable."
  type        = string
  sensitive   = true
  default     = ""
}

variable "pod_cidr" {
  description = "Pod network CIDR metadata (K3s default)."
  type        = string
  default     = "10.42.0.0/16"
}

variable "service_cidr" {
  description = "Service network CIDR metadata (K3s default)."
  type        = string
  default     = "10.43.0.0/16"
}

variable "metallb_pool_range" {
  description = "MetalLB address pool metadata for bare-metal prod."
  type        = string
  default     = "10.0.0.100-10.0.0.120"
}
