output "namespace_names" {
  description = "Names of the provisioned logical namespaces."
  value       = sort([for ns in kubernetes_namespace_v1.tier : ns.metadata[0].name])
}

output "pod_cidr" {
  description = "Pod network CIDR recorded for this environment."
  value       = var.pod_cidr
}

output "service_cidr" {
  description = "Service network CIDR recorded for this environment."
  value       = var.service_cidr
}

output "metallb_pool_range" {
  description = "MetalLB address pool range recorded for this environment."
  value       = var.metallb_pool_range
}
