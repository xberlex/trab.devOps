param(
  [string]$ComposeFile = "docker-compose.yml"
)

Write-Host "Building and starting ClinicFlow containers..."
docker compose -f $ComposeFile up -d --build

Write-Host "Deploy finished."
Write-Host "Frontend: http://localhost:5173"
Write-Host "Backend: http://localhost:5000/health"