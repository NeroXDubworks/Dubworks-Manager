@echo off
setlocal
cd /d "%~dp0"
if not exist "package.json" (
  if exist "Dubworks-Manager_v33_Filtros-Membros_completo\package.json" (
    cd /d "Dubworks-Manager_v33_Filtros-Membros_completo"
  ) else (
    echo Copie este arquivo para a pasta do sistema, junto de package.json.
    pause
    exit /b 1
  )
)
if not exist "integracoes\whatsapp-bot\start-manager.cjs" (
  echo Aplique a correcao v36.1 nesta pasta antes de usar este arquivo.
  pause
  exit /b 1
)
where node >nul 2>nul
if errorlevel 1 (
  echo Instale o Node.js antes de abrir o sistema.
  pause
  exit /b 1
)
if not exist "node_modules\vite\bin\vite.js" (
  call npm.cmd ci --no-audit --no-fund
  if errorlevel 1 goto falha
)
echo Deixe esta janela aberta enquanto usar o sistema e o bot.
node integracoes\whatsapp-bot\start-manager.cjs
if errorlevel 1 goto falha
exit /b 0
:falha
echo O sistema nao iniciou. Confira a mensagem acima.
pause
exit /b 1
