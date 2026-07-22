@echo off
start "Backend" cmd /k "cd /d C:\Users\Usuario\Desktop\projetos\CRM Exora\backend && npx tsx src/index.ts"
timeout /t 3 /nobreak >nul
start "Frontend" cmd /k "cd /d C:\Users\Usuario\Desktop\projetos\CRM Exora\frontend && npx vite --port 5173"
echo Servidores iniciados!
