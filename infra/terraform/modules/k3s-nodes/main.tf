resource "terraform_data" "minikube_cluster" {
  count = var.cluster_provider == "minikube" ? 1 : 0

  #checkov:skip=CKV_SECRET_6:local-exec only passes cluster sizing flags to minikube and kubectl; no credentials
  input = {
    cluster_name   = var.cluster_name
    node_count     = var.node_count
    node_cpus      = var.node_cpus
    node_memory_mb = var.node_memory_mb
    topology_zones = join(",", var.topology_zones)
  }

  triggers_replace = {
    cluster_name   = var.cluster_name
    node_count     = var.node_count
    node_cpus      = var.node_cpus
    node_memory_mb = var.node_memory_mb
  }

  provisioner "local-exec" {
    interpreter = ["/bin/bash", "-c"]
    environment = {
      CLUSTER_NAME   = var.cluster_name
      NODE_COUNT     = tostring(var.node_count)
      NODE_CPUS      = tostring(var.node_cpus)
      NODE_MEMORY_MB = tostring(var.node_memory_mb)
      TOPOLOGY_ZONES = join(" ", var.topology_zones)
    }
    command = <<-EOT
      set -euo pipefail
      if ! minikube status --profile="$${CLUSTER_NAME}" >/dev/null 2>&1; then
        minikube start \
          --profile="$${CLUSTER_NAME}" \
          --nodes="$${NODE_COUNT}" \
          --driver=docker \
          --cpus="$${NODE_CPUS}" \
          --memory="$${NODE_MEMORY_MB}mb" \
          --addons=metrics-server
      fi

      mapfile -t nodes < <(kubectl --context="$${CLUSTER_NAME}" get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}')
      read -r -a zones <<< "$${TOPOLOGY_ZONES}"
      for i in "$${!nodes[@]}"; do
        zone="$${zones[i]:-zone-a}"
        kubectl --context="$${CLUSTER_NAME}" label node "$${nodes[i]}" "topology.kubernetes.io/zone=$${zone}" --overwrite
        if ! kubectl --context="$${CLUSTER_NAME}" get node "$${nodes[i]}" -o jsonpath='{.metadata.labels}' | grep -q 'node-role.kubernetes.io/control-plane'; then
          kubectl --context="$${CLUSTER_NAME}" label node "$${nodes[i]}" "node-role.kubernetes.io/worker=true" --overwrite
        fi
      done
    EOT
  }
}

resource "terraform_data" "k3s_topology" {
  count = var.cluster_provider == "k3s" ? 1 : 0

  input = {
    cluster_name   = var.cluster_name
    node_count     = var.node_count
    node_cpus      = var.node_cpus
    node_memory_mb = var.node_memory_mb
    topology_zones = var.topology_zones
    note           = "Bare-metal/VM K3s HA topology definition; machine provisioning is out of band for Phase 1."
  }
}
