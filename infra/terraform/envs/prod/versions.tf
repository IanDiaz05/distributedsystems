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
    external = {
      source  = "hashicorp/external"
      version = ">= 2.3.0"
    }
  }
}

# The flux provider does not read GITHUB_TOKEN itself. Prefer var.github_token
# (-var / TF_VAR_github_token); otherwise fall back to the process environment.
data "external" "github_token_env" {
  program = [
    "python3",
    "-c",
    "import json, os; print(json.dumps({'token': os.environ.get('GITHUB_TOKEN', '')}))",
  ]
}

locals {
  flux_git_token = var.github_token != "" ? var.github_token : data.external.github_token_env.result.token
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
      password = local.flux_git_token
    }
  }
}

check "flux_bootstrap_requires_github_token" {
  assert {
    condition     = !var.enable_flux_bootstrap || local.flux_git_token != ""
    error_message = "enable_flux_bootstrap=true requires a GitHub token. Pass -var=\"github_token=$GITHUB_TOKEN\", set TF_VAR_github_token, or export GITHUB_TOKEN."
  }
}
