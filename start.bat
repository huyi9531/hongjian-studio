@echo off
setlocal

cd /d "%~dp0"

where pnpm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] pnpm is required. Install Node.js 22.12+ and run: corepack enable
  exit /b 1
)

if not exist "node_modules\" (
  echo [INFO] Installing dependencies...
  call pnpm install --frozen-lockfile
  if errorlevel 1 exit /b 1
)

if not exist ".env.local" (
  copy ".env.example" ".env.local" >nul
  echo [INFO] Created .env.local. Configure it before using generation services.
)

call pnpm dev
