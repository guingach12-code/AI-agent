@echo off
REM ============================================================
REM   Adam - Publier le site sur Netlify (sans questions)
REM ============================================================
REM   Double-clique ce fichier. Il faut Node.js et internet.
REM   La 1ere fois, ton navigateur s'ouvre sur Netlify : connecte-toi
REM   (compte gratuit) et clique "Authorize". C'est tout.
REM   L'adresse du site est notee dans publication-log.txt.
REM ------------------------------------------------------------
cd /d "%~dp0"
set LOG=publication-log.txt
echo.
echo ===========================================
echo   Publication du site Adam sur Netlify
echo ===========================================
echo.
if not exist "index.html" (
  echo ERREUR : index.html est introuvable.
  pause
  exit /b 1
)
if exist "Adam-Setup-1.1.0.exe" (
  echo [OK] Installateur Windows present.
) else (
  echo [i] Installateur absent : le bouton Windows dira "en preparation".
  echo     Le reste du site, l'agent en direct et Adam Web marchent quand meme.
)
echo.
echo Si ton navigateur s'ouvre : connecte-toi a Netlify et clique "Authorize".
echo.
if exist ".netlify\state.json" goto redeployer

:creer
powershell -NoProfile -ExecutionPolicy Bypass -Command "& { npx -y netlify-cli deploy --prod --dir . --create-site adam-nuage-ia 2>&1 | Tee-Object -FilePath '%LOG%' }"
if exist ".netlify\state.json" goto fin
echo Le nom adam-nuage-ia est peut-etre pris, j'essaie avec un nom au hasard...
powershell -NoProfile -ExecutionPolicy Bypass -Command "& { npx -y netlify-cli deploy --prod --dir . --create-site 2>&1 | Tee-Object -FilePath '%LOG%' }"
goto fin

:redeployer
powershell -NoProfile -ExecutionPolicy Bypass -Command "& { npx -y netlify-cli deploy --prod --dir . 2>&1 | Tee-Object -FilePath '%LOG%' }"

:fin
echo.
findstr /i /c:"Deployed to production" /c:"Website URL" /c:"Production URL" "%LOG%" >nul
if errorlevel 1 (
  echo *** La publication n'a pas abouti. Le detail est dans %LOG%. ***
) else (
  echo ===========================================
  echo   Termine ! Ton site est en ligne.
  echo   L'adresse est affichee ci-dessus.
  echo ===========================================
)
echo.
pause
