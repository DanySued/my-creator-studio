@echo off
cd /d "%~dp0"
echo Deploying Privacy Policy to Netlify...
python deploy_privacy.py
