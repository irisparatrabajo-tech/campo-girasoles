@echo off
cd /d "C:\Users\poeti\Desktop\WEB INFORMACION CAMPO DIRASOLES\sitio"
echo.
echo  ============================================
echo   Campo de Girasoles - servidor local
echo  ============================================
echo   Abriendo http://localhost:4321 en tu navegador...
echo   Manten esta ventana abierta mientras ves la web.
echo   Para detener: cierra esta ventana o Ctrl+C.
echo.
start "" http://localhost:4321
node server.mjs
pause
