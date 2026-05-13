@echo off
cd /d "%~dp0"
echo Running migrate + seed in container my-creator-studio-api-1...
docker exec my-creator-studio-api-1 python /app/migrate_and_seed.py
pause
