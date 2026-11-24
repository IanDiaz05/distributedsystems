output "flux_namespace" {
  description = "Namespace used by Flux controllers."
  value       = var.flux_namespace
}

output "bootstrap_enabled" {
  description = "Whether flux_bootstrap_git was created in this apply."
  value       = var.enable_flux_bootstrap
}
