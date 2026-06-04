param(
  [string]$ComposeFile = "docker-compose.yml"
)

Write-Host "Rolling back by recreating containers from previous local images..."
docker compose -f $ComposeFile up -d --no-build

Write-Host "Rollback command finished."
Write-Host "Check logs with: docker compose logs"