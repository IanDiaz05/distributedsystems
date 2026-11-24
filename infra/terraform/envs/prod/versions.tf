terraform {
  required_version = ">= 1.7.0"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = ">= 2.35.0"
    }
    flux = {
      source  = "fluxcd/flux"
      version = ">= 1.5.0"
    }
  }
}

provider "kubernetes" {
  config_path    = "~/.kube/config"
  config_context = var.cluster_name
}

provider "flux" {
  kubernetes = {
    config_path    = "~/.kube/config"
    config_context = var.cluster_name
  }
  git = {
    url    = var.git_repository
    branch = var.git_branch
    http = {
      username = "git"
      password = var.github_token
    }
  }
}
