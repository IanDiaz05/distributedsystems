resource "flux_bootstrap_git" "this" {
  count = var.enable_flux_bootstrap ? 1 : 0

  namespace = var.flux_namespace
  path      = var.target_path
}
