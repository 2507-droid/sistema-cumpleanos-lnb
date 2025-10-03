@echo off
chcp 65001 >nul
title Sistema Cumpleaños LNB - Servidor
echo ========================================
echo    SISTEMA AUTOMATICO DE CUMPLEANOS LNB
echo ========================================
echo.
echo Iniciando servidor...
echo 📧 Email: cumpleanos@lnb.gob.pa
echo 🕛 Envio automatico: 12:00 PM diario
echo 🌐 URL: http://localhost:3000
echo.
timeout /t 3 /nobreak >nul

node server.js

echo.
echo Presiona cualquier tecla para cerrar...
pause >nul