output "storage_class_name" {
  description = "Name of the StorageClass created for stateful workloads."
  value       = kubernetes_storage_class_v1.store_replicated.metadata[0].name
}
