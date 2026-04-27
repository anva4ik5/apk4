@echo off
setlocal
set NPM_EXE=C:\Users\SERVER\tools\node-lts\npm.cmd
if not exist "%NPM_EXE%" (
  echo Portable npm not found: %NPM_EXE%
  exit /b 1
)
cd /d "%~dp0"

call "%NPM_EXE%" --workspace @gta-rp/altv-server run build || exit /b 1
call "%NPM_EXE%" --workspace @gta-rp/client run build || exit /b 1

if not exist "altv\resources\gta-rp-core\server" mkdir "altv\resources\gta-rp-core\server"
if not exist "altv\resources\gta-rp-core\client" mkdir "altv\resources\gta-rp-core\client"

copy /Y "packages\altv-server\dist\index.js" "altv\resources\gta-rp-core\server\index.js" >nul
copy /Y "packages\client\dist\index.js" "altv\resources\gta-rp-core\client\index.js" >nul

echo alt:V resource synced.
