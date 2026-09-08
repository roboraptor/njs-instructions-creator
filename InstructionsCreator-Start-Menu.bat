@echo off
:: Change the working directory to the folder where this batch file is located
cd /d "%~dp0"

:: Colors Settings
:: Support ANSI colors in CMD for the current user
reg add "HKCU\Console" /v VirtualTerminalLevel /t REG_DWORD /d 1 /f >nul 2>&1
:: Reliable method to get the right ESC character in newer Windows
for /f "tokens=4 delims=[." %%a in ('ver') do (
    :: This trick creates a real escape character into the ESC variable
    set "ESC="
)
:: If the above trick fails in the editor, use the verified choice trick:
if not defined ESC for /f "tokens=27 delims=" %%a in ('choice /c a /t 1 /d a /n ^<nul') do set "ESC= %%a"
:: Remove space if choice added it
set "ESC=%ESC:~-1%"
:: Color Definitions
set "RED=%ESC%[91m"
set "GREEN=%ESC%[92m"
set "YELLOW=%ESC%[93m"
set "BLUE=%ESC%[94m"
set "RESET=%ESC%[0m"
:: Enable UTF-8 for checkmarks
chcp 65001 >nul
:: Symbol definitions
set "EMPTY=[?]"
set "CHECK=%GREEN%[✓]%RESET%"
set "WARNI=%YELLOW%[^^^]%RESET%"
set "CROSS=%RED%[✗]%RESET%"
set "PLAYG=%GREEN%[▶]%RESET%"
set "PLAYR=%RED%[▶]%RESET%"

:: Delayed expansion is used to expand variables in a loop
setlocal enabledelayedexpansion

set "NdJSava=%EMPTY%"
set "Git_ava=%EMPTY%"
set "ps_exec=%EMPTY%"
set "latestv=%EMPTY%"
set "depenOK=%WARNI%"
set "run_dev=%WARNI%"
set "builtOK=%WARNI%"
set "runprod=%PLAYR%"

call :silent_check

:menu
cls
echo %BLUE%===================================================%RESET%
echo %BLUE%*     REDLIGHT QoP - QUALITY OF PRODUCTION        *%RESET%
echo %BLUE%===================================================%RESET%
echo.
echo Please select an option:
echo.
echo   [%BLUE%1%RESET%] %NdJSava% Check for Node.js
echo   [%BLUE%2%RESET%] %Git_ava% Check for Git
echo   [%BLUE%3%RESET%] %ps_exec% Check/Configure PowerShell Execution Policy
echo   [%BLUE%4%RESET%] %latestv% Pull newest version from Git (git pull)
echo   [%BLUE%5%RESET%] %depenOK% Install dependencies (npm install)
echo   [%BLUE%6%RESET%] %run_dev% Run DEV Server (npm run dev)
echo   [%BLUE%7%RESET%] %builtOK% Build Production (npm run build)
echo   [%BLUE%8%RESET%] %runprod% Run PROD Server (npm run start)
echo   [%BLUE%9%RESET%] Exit
echo.
echo %BLUE%===================================================%RESET%
echo.
set "choice="
set /p choice=Enter selection [1-9]: 

if "%choice%"=="1" goto check_node
if "%choice%"=="2" goto check_git
if "%choice%"=="3" goto configure_execution_policy
if "%choice%"=="4" goto gitpull_update
if "%choice%"=="5" goto install_dependencies
if "%choice%"=="6" goto run_devel
if "%choice%"=="7" goto run_build
if "%choice%"=="8" goto run_prod
if "%choice%"=="9" goto exit_prog

echo.
echo %RED%Invalid selection, please try again.%RESET%
timeout /t 2 > nul
goto menu

:silent_check
where npm >nul 2>nul
if %errorlevel% neq 0 (
    set "NdJSava=%CROSS%"
) else (
    set "NdJSava=%CHECK%"
)
where git >nul 2>nul
if %errorlevel% neq 0 (
    set "Git_ava=%CROSS%"
) else (
    set "Git_ava=%CHECK%"
)
for /f "usebackq delims=" %%i in (`powershell -Command "Get-ExecutionPolicy"`) do (
    set "CURRENT_POLICY=%%i"
)
if /i "%CURRENT_POLICY%"=="Restricted" (
    set "ps_exec=%CROSS%"
) else (
    set "ps_exec=%CHECK%"
)
if exist "node_modules" (
    set "depenOK=%WARNI%"
    set "run_dev=%WARNI%"
) else (
    set "depenOK=%CROSS%"
    set "run_dev=%CROSS%"
)
if exist ".next" (
    set "builtOK=%WARNI%"
    set "runprod=%PLAYR%"
) else (
    set "builtOK=%CROSS%"
    set "runprod=%CROSS%"
)
exit /b


:check_node
cls
echo %BLUE%#### #### CHECKING NODEJS #### ####%RESET%
echo.
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo %RED%#### ####%RESET% NODEJS NOT FOUND %RED%#### ####%RESET%
    echo.
    echo Node.js/npm was not found in your system PATH.
    echo Please install it from https://nodejs.org/en/download/
    echo Recommended version: %GREEN%NodeJS 22 LTS%RESET%
    echo Archive: https://nodejs.org/en/download/archive/v22.23.1
    set "NodeJS_Available=%RED%"
) else (
    echo %GREEN%#### ####%RESET% NODEJS FOUND %GREEN%#### ####%RESET%
    echo.
    for /f "usebackq" %%v in (`node -v`) do set "NODE_VER=%%v"
    for /f "usebackq" %%v in (`npm -v`) do set "NPM_VER=%%v"
    echo Node.js version: %GREEN%!NODE_VER!%RESET%
    echo npm version:     %GREEN%!NPM_VER!%RESET%
    set "NodeJS_Available=%GREEN%"
)
echo.
echo %BLUE%===================================================%RESET%
echo.
pause
goto menu

:check_git
cls
echo %BLUE%#### #### CHECKING GIT #### ####%RESET%
echo.
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo %RED%#### ####%RESET% GIT NOT FOUND %RED%#### ####%RESET%
    echo.
    echo Git was not found in your system PATH.
    echo Please install it from https://git-scm.com/install
    set "Git_Available=%RED%"
) else (
    echo %GREEN%#### ####%RESET% GIT FOUND %GREEN%#### ####%RESET%
    echo.
    for /f "usebackq tokens=3" %%v in (`git --version`) do set "GIT_VER=%%v"
    echo Git version: %GREEN%!GIT_VER!%RESET%
    set "Git_Available=%GREEN%"
)
echo.
echo %BLUE%===================================================%RESET%
echo.
pause
goto menu

:configure_execution_policy
cls
echo %BLUE%#### #### CHECKING POWERSHELL EXECUTION POLICY #### ####%RESET%
echo.
:: Checking actual Execution Policy
for /f "usebackq delims=" %%i in (`powershell -Command "Get-ExecutionPolicy"`) do (
    set "CURRENT_POLICY=%%i"
)

:: Configure PowerShell execution policy if Restricted
if /i "%CURRENT_POLICY%"=="Restricted" (
    echo %YELLOW%PowerShell execution policy is set to 'Restricted'.%RESET%
    echo Setting it to 'RemoteSigned' to allow Node.js script wrappers to run...
    echo.
    
    :: Try LocalMachine (requires admin rights)
    powershell -Command "Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine -Force" 2>nul
    
    :: Fallback to CurrentUser if the previous command failed
    if errorlevel 1 (
        echo You don't have admin rights, setting policy only for current user...
        echo.
        powershell -Command "Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force" 2>nul
    )
) else (
    echo PowerShell policy is set to: %GREEN%%CURRENT_POLICY%%RESET% 
    echo Leaving unchanged
)
echo.
echo %BLUE%===================================================%RESET%
echo.
set "ps_exec=%CHECK%"
pause
goto menu

:gitpull_update
cls
echo %BLUE%#### #### PULLING LATEST VERSION #### ####%RESET%
echo.
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo %RED%Error: Git is required to pull updates.%RESET%
    echo Please run option [2] to check Git installation.
    echo.
    pause
    goto menu
)
echo Pulling latest changes from Git...
echo.
call git pull
echo.
echo %BLUE%===================================================%RESET%
echo.
set "latestv=%CHECK%"
set "depenOK=%PLAYG%"
set "run_dev=%PLAYR%"
set "buildOK=%WARNI%"
pause
goto menu

:install_dependencies
cls
echo %BLUE%#### #### INSTALLING DEPENDENCIES #### ####%RESET%
echo.
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo %RED%Error: Node.js/npm is required to install dependencies.%RESET%
    echo Please run option [1] to check Node.js installation.
    echo.
    pause
    goto menu
)
echo Installing dependencies, please wait (this may take a while)...
echo.
call npm -d install
echo.
echo %GREEN%Dependencies check/installation completed.%RESET%
echo.
echo %BLUE%===================================================%RESET%
echo.
set "depenOK=%CHECK%"
set "run_dev=%PLAYG%"
set "builtOK=%PLAYG%"
pause
goto menu

:run_devel
cls
echo %BLUE%#### #### STARTING DEV SERVER #### ####%RESET%
echo.
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo %RED%Error: Node.js/npm is required to run the development server.%RESET%
    echo.
    pause
    goto menu
)
echo.
echo %BLUE%Starting Redlight QF DEV server...%RESET%
echo Server is starting up. If the browser didn't open automatically, go to http://localhost:3000
echo You can %GREEN%minimize%RESET% this window, but %YELLOW%DO NOT CLOSE IT!%RESET%
echo Press Ctrl+C and then N to terminate the server.
echo.
timeout /t 2 > nul
start http://localhost:3000
call npm run dev
echo.
pause
goto menu

:run_build
cls
echo %BLUE%#### #### BUILDING PRODUCTION #### ####%RESET%
echo.
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo %RED%Error: Node.js/npm is required to build the application.%RESET%
    echo.
    pause
    goto menu
)
echo Starting to build production version of Redlight QF...
echo Please wait...
echo.
call npm run build
echo.
echo %BLUE%===================================================%RESET%
echo.
set "builtOK=%CHECK%"
set "runprod=%PLAYG%"
pause
goto menu

:run_prod
cls
echo %BLUE%#### #### STARTING PROD SERVER #### ####%RESET%
echo.
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo %RED%Error: Node.js/npm is required to run the production server.%RESET%
    echo.
    pause
    goto menu
)

:: Check build
if not exist ".next" (
    echo %RED%#### #### APP NOT BUILT #### ####%RESET%
    echo.
    echo The production build was not found ^(missing .next folder^).
    echo Please run option [7] to build the application first.
    echo.
    pause
    goto menu
)
echo.
echo %BLUE%Starting Redlight QF PROD server...%RESET%
echo Server is starting up. If the browser didn't open automatically, go to http://localhost:3000
echo You can %GREEN%minimize%RESET% this window, but %YELLOW%DO NOT CLOSE IT!%RESET%
echo Press Ctrl+C and then N to terminate the server.
echo.
timeout /t 2 > nul
start http://localhost:3000
call npm run start
echo.
pause
goto menu

:exit_prog
cls
echo Thank you for using Redlight QF!
timeout /t 2 > nul
exit
