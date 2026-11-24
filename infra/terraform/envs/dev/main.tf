module "k3s_nodes" {
  source = "../../modules/k3s-nodes"

  cluster_name     = var.cluster_name
  cluster_provider = var.cluster_provider
  node_count       = var.node_count
  node_cpus        = var.node_cpus
  node_memory_mb   = var.node_memory_mb
}

module "network" {
  source = "../../modules/network"

  environment        = var.environment
  pod_cidr           = var.pod_cidr
  service_cidr       = var.service_cidr
  metallb_pool_range = var.metallb_pool_range

  depends_on = [module.k3s_nodes]
}

module "storage" {
  source = "../../modules/storage"

  environment         = var.environment
  storage_provisioner = var.storage_provisioner

  depends_on = [module.k3s_nodes]
}

module "flux_bootstrap" {
  source = "../../modules/flux-bootstrap"

  target_path           = var.target_path
  enable_flux_bootstrap = var.enable_flux_bootstrap

  depends_on = [
    module.network,
    module.storage,
  ]
}
