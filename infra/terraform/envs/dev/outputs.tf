output "cluster_name" {
  description = "Name of the provisioned cluster."
  value       = module.k3s_nodes.cluster_name
}

output "node_count" {
  description = "Configured node count."
  value       = module.k3s_nodes.node_count
}

output "kubeconfig_context" {
  description = "kubeconfig context for kubectl."
  value       = module.k3s_nodes.kubeconfig_context
}

output "topology_zones" {
  description = "Node topology zone labels."
  value       = module.k3s_nodes.topology_zones
}

output "namespace_names" {
  description = "Logical namespaces created for platform tiers."
  value       = module.network.namespace_names
}

output "pod_cidr" {
  description = "Pod network CIDR metadata."
  value       = module.network.pod_cidr
}

output "service_cidr" {
  description = "Service network CIDR metadata."
  value       = module.network.service_cidr
}

output "metallb_pool_range" {
  description = "MetalLB address pool metadata."
  value       = module.network.metallb_pool_range
}

output "storage_class_name" {
  description = "StorageClass used by stateful workloads."
  value       = module.storage.storage_class_name
}

output "flux_namespace" {
  description = "Namespace reserved for Flux controllers."
  value       = module.flux_bootstrap.flux_namespace
}

output "flux_bootstrap_enabled" {
  description = "Whether Flux bootstrap ran in this apply."
  value       = module.flux_bootstrap.bootstrap_enabled
}
