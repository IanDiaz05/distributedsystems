output "cluster_name" {
  description = "Name of the cluster / kubeconfig context."
  value       = var.cluster_name
}

output "node_count" {
  description = "Configured node count."
  value       = var.node_count
}

output "kubeconfig_context" {
  description = "kubectl context that matches the cluster profile."
  value       = var.cluster_name
}

output "topology_zones" {
  description = "Availability-zone labels used for topologySpreadConstraints."
  value       = var.topology_zones
}
