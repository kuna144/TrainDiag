@echo off
echo 📦 Creating package for deployment...
echo.

REM Tworzenie folderu TrainDiag-Release
if exist "TrainDiag-Release" rmdir /s /q "TrainDiag-Release"
mkdir "TrainDiag-Release"

echo ✅ Copying necessary files...

REM Kopiowanie plików aplikacji
copy "package.json" "TrainDiag-Release\"
copy "server.js" "TrainDiag-Release\"
copy "DEPLOYMENT.md" "TrainDiag-Release\"

REM Kopiowanie folderu dist (zbudowana aplikacja)
xcopy "dist" "TrainDiag-Release\dist\" /E /I /Q

REM Kopiowanie konfiguracji
xcopy "src\config.json" "TrainDiag-Release\src\" /I /Q

REM Tworzenie uproszczonego package.json tylko z produkcyjnymi zależnościami
(
echo {
echo   "name": "vacuum-toilet-controller-pwa",
echo   "version": "1.0.0",
echo   "description": "PWA dla diagnostyki sterowników toalet próżniowych",
echo   "main": "server.js",
echo   "scripts": {
echo     "start": "node server.js",
echo     "server": "node server.js"
echo   },
echo   "dependencies": {
echo     "express": "^5.1.0",
echo     "cors": "^2.8.5",
echo     "axios": "^1.13.0"
echo   }
echo }
) > "TrainDiag-Release\package.json"

REM Tworzenie pliku start.bat do łatwego uruchamiania
(
echo @echo off
echo echo Starting TrainDiag Server...
echo echo.
echo echo Checking Node.js...
echo node --version ^>nul 2^>^&1
echo if errorlevel 1 ^(
echo     echo Node.js is not installed!
echo     echo Download from: https://nodejs.org/
echo     pause
echo     exit /b 1
echo ^)
echo.
echo echo Checking dependency...
echo if not exist "node_modules\" ^(
echo     echo Installing dependencies...
echo     npm install
echo     if errorlevel 1 ^(
echo         echo Dependency installation error!
echo         pause
echo         exit /b 1
echo     ^)
echo ^)
echo.
echo echo Starting server...
echo echo Application ready to use: http://localhost:3000
echo echo For stop server, press Ctrl+C
echo echo.
echo node server.js
echo pause
) > "TrainDiag-Release\start.bat"

REM Tworzenie pliku README dla użytkownika
(
echo # TrainDiag - Aplikacja do diagnostyki
echo.
echo ## Jak uruchomić:
echo.
echo 1. **Kliknij dwukrotnie na `start.bat`**
echo    - Automatycznie zainstaluje zależności (przy pierwszym uruchomieniu^)
echo    - Uruchomi serwer aplikacji
echo.
echo 2. **Otwórz przeglądarkę i przejdź do:**
echo    ```
echo    http://localhost:3000
echo    ```
echo.
echo ## Wymagania:
echo - Node.js (wersja 18 lub nowsza^) - pobierz z https://nodejs.org/
echo.
echo ## Konfiguracja:
echo - Adres IP sterownika można zmienić w pliku `src/config.json`
echo - Domyślny adres: `192.168.0.100`
echo.
echo ## Rozwiązywanie problemów:
echo - Jeśli port 3000 jest zajęty, zamknij inne aplikacje
echo - Upewnij się, że sterownik jest dostępny w sieci
echo.
echo ---
echo **TrainDiag v1.0** - Gotowe do użycia!
) > "TrainDiag-Release\README.md"

echo.
echo ✅ Package ready in directory: TrainDiag-Release
echo 📂 Copy the entire TrainDiag-Release folder to the target computer
echo 🚀 On the target computer, run: start.bat
echo.
echo 📋 Package contents:
dir "TrainDiag-Release" /b
echo.
pause