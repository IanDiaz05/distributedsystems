terraform {
  backend "local" {
    path = "terraform.tfstate"
  }
}

# Ready-to-enable remote state (comment out the local backend above first):
# terraform {
#   backend "s3" {
#     bucket         = "distributed-store-terraform-state"
#     key            = "envs/prod/terraform.tfstate"
#     region         = "us-east-1"
#     dynamodb_table = "distributed-store-terraform-locks"
#     encrypt        = true
#     use_lockfile   = true
#   }
# }
