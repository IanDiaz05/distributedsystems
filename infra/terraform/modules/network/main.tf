resource "kubernetes_namespace_v1" "tier" {
  for_each = toset(var.namespace_names)

  wait_for_default_service_account = true

  metadata {
    name = each.value

    labels = {
      "app.kubernetes.io/part-of"        = "distributed-store"
      "app.kubernetes.io/managed-by"     = "terraform"
      environment                        = var.environment
      "pod-security.kubernetes.io/warn"  = "restricted"
      "pod-security.kubernetes.io/audit" = "restricted"
      "kubernetes.io/metadata.name"      = each.value
    }
  }
}
