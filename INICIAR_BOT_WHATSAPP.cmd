@echo off
setlocal
cd /d "%~dp0"
if not exist "package.json" (
  if exist "Dubworks-Manager_v33_Filtros-Membros_completo\package.json" (
    cd /d "Dubworks-Manager_v33_Filtros-Membros_completo"
  ) else (
    echo Copie este arquivo para a pasta do DubWorks Manager, junto de package.json.
    pause
    exit /b 1
  )
)
if not exist "integracoes\whatsapp-bot\server.cjs" (
  echo Esta pasta ainda nao recebeu a integracao WhatsApp v36.
  pause
  exit /b 1
)
where node >nul 2>nul
if errorlevel 1 (
  echo O Node.js precisa estar instalado para iniciar o bot.
  pause
  exit /b 1
)
node --input-type=module -e "try { const r=await fetch('http://127.0.0.1:8765/api/status',{signal:AbortSignal.timeout(3000)}); const j=await r.json(); process.exit(r.status===401 && j.ok===false ? 0 : 1); } catch { process.exit(1); }"
if not errorlevel 1 (
  echo O servico do bot ja esta ativo. Volte ao Manager e clique em Atualizar.
  pause
  exit /b 0
)
if not exist "integracoes\whatsapp-bot\node_modules\whatsapp-web.js\package.json" (
  call npm.cmd run bot:install
  if errorlevel 1 (
    echo Nao foi possivel instalar as bibliotecas. Confira sua conexao com a internet.
    pause
    exit /b 1
  )
)
echo Deixe esta janela aberta enquanto usar o bot.
echo No Manager, clique em Bot automatico WhatsApp e depois em Atualizar.
echo A conexao ao WhatsApp e o inicio dos envios dependem dos botoes no Manager.
call npm.cmd run bot:start
if errorlevel 1 (
  echo O servico encerrou com erro. Veja a mensagem acima.
  pause
)
endlocal
