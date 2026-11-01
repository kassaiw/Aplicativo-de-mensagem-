@echo off
chcp 65001 >nul
title Instalar o cloudflared - link pros amigos
cd /d "%~dp0"
echo.
echo  Vou instalar o cloudflared. Ele cria o link pros seus amigos entrarem
echo  de qualquer lugar. Voce so precisa fazer isso UMA vez.
echo.
echo  Se o Windows perguntar se pode fazer alteracoes, clique em SIM.
echo.
where winget >nul 2>nul
if errorlevel 1 goto semwinget

winget install --id Cloudflare.cloudflared -e --accept-source-agreements --accept-package-agreements
echo.
echo  Pronto! Agora feche o Resenha, se estiver aberto, e abra o iniciar.bat de novo.
echo  O link pros amigos vai aparecer na janela preta.
echo.
pause
exit /b

:semwinget
echo  Seu Windows nao tem o winget. Faca na mao:
echo.
echo   1. Vai abrir a pagina de downloads do cloudflared
echo   2. Baixe o arquivo  cloudflared-windows-amd64.exe
echo   3. Renomeie para    cloudflared.exe
echo   4. Coloque dentro desta pasta, junto com o server.js
echo.
start "" https://github.com/cloudflare/cloudflared/releases/latest
pause
