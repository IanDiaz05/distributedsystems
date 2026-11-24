resource "kubernetes_storage_class_v1" "store_replicated" {
  #checkov:skip=CKV_K8S_STORAGE:hostpath/Longhorn provisioner is environment-specific; encryption is not applicable to minikube-hostpath
  metadata {
    name = var.storage_class_name
    labels = {
      "app.kubernetes.io/part-of"    = "distributed-store"
      "app.kubernetes.io/managed-by" = "terraform"
      environment                    = var.environment
    }
  }

  storage_provisioner    = var.storage_provisioner
  reclaim_policy         = "Retain"
  volume_binding_mode    = "WaitForFirstConsumer"
  allow_volume_expansion = true
}
