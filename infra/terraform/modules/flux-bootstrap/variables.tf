variable "target_path" {
  description = "Path in the Git repository that Flux reconciles (clusters/dev or clusters/prod)."
  type        = string
}

variable "enable_flux_bootstrap" {
  description = "When false, skip flux_bootstrap_git so plan/apply succeed before Phase 5 GitOps paths and GITHUB_TOKEN exist."
  type        = bool
}

variable "flux_namespace" {
  description = "Namespace that hosts Flux controllers."
  type        = string
  default     = "flux-system"
}
