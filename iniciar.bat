@echo off
chcp 65001 >nul
title Resenha - Servidor (NAO FECHE ESTA JANELA)
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto semnode

node server.js
echo.
echo  O servidor foi desligado.
pause
exit /b

:semnode
echo.
echo  [ERRO] O Node.js nao esta instalado neste computador.
echo.
echo   1. Vai abrir o site nodejs.org
echo   2. Baixe a versao LTS e instale - e so ir clicando em Next
echo   3. Depois abra este arquivo de novo
echo.
start "" https://nodejs.org
pause
