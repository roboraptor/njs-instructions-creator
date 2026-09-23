@echo off
:: ===================================================================
:: ProjectRunner - Universal NodeJS Project Starter & Control Menu
:: ===================================================================
cd /d "%~dp0"

:: -------------------------------------------------------------------
:: 1. ANSI Colors & UTF-8 Setup
:: -------------------------------------------------------------------
reg add "HKCU\Console" /v VirtualTerminalLevel /t REG_DWORD /d 1 /f >nul 2>&1
for /f "delims=" %%a in ('powershell -NoProfile -Command "[char]27"') do set "ESC=%%a"
if not defined ESC (
    for /f "tokens=27 delims=" %%a in ('choice /c a /t 1 /d a /n ^<nul') do set "ESC= %%a"
    set "ESC=!ESC:~-1!"
)

set "RED=%ESC%[91m"
set "GREEN=%ESC%[92m"
set "YELLOW=%ESC%[93m"
set "BLUE=%ESC%[94m"
set "MAGENTA=%ESC%[95m"
set "CYAN=%ESC%[96m"
set "WHITE=%ESC%[97m"
set "GRAY=%ESC%[90m"
set "BOLD=%ESC%[1m"
set "RESET=%ESC%[0m"

chcp 65001 >nul

setlocal enabledelayedexpansion

:: Status Badges
set "EMPTY=[?]"
set "CHECK=%GREEN%[✓]%RESET%"
set "WARNI=%YELLOW%[!]%RESET%"
set "CROSS=%RED%[✗]%RESET%"
set "NA_BADGE=%GRAY%[-]%RESET%"
set "PLAYG=%GREEN%[▶]%RESET%"
set "PLAYR=%RED%[▶]%RESET%"

:: Initial Setup
call :init_config
call :silent_check

:: -------------------------------------------------------------------
:: 2. Main Menu Loop
:: -------------------------------------------------------------------
:menu
call :silent_check
cls
echo %BLUE%===================================================================%RESET%
echo %BLUE%* %BOLD%!PROJECT_TITLE!%RESET%%BLUE% %RESET%
if defined PROJECT_SUBTITLE (
    echo %GRAY%  !PROJECT_SUBTITLE!%RESET%
)
echo %GRAY%  Directory: %CD%%RESET%
echo %BLUE%===================================================================%RESET%
echo.
echo %BOLD%Please select an option:%RESET%
echo.
echo   [%CYAN%1%RESET%] !NdJSava! Check Node.js / npm environment
echo   [%CYAN%2%RESET%] !Git_ava! Check Git environment
echo   [%CYAN%3%RESET%] !ps_exec! Check/Configure PowerShell Execution Policy
echo   [%CYAN%4%RESET%] !latestv! Pull latest version from Git (git pull)
echo   [%CYAN%5%RESET%] !depenOK! Install dependencies (!INSTALL_CMD!)
echo   [%CYAN%6%RESET%] !env_stat! Environment variables (.env setup)
echo   [%CYAN%7%RESET%] !run_dev! Run DEV Server (!DEV_CMD!)
echo   [%CYAN%8%RESET%] !builtOK! Build Production (!BUILD_CMD!)
echo   [%CYAN%9%RESET%] !runprod! Run PROD Server (!PROD_CMD!)
echo.
echo   [%YELLOW%C%RESET%] Clean ^& Reinstall dependencies (wipe node_modules)
echo   [%YELLOW%R%RESET%] Refresh status ^& reload configuration
echo   [%CYAN%A%RESET%] About ProjectRunner
echo   [%CYAN%0%RESET%] Exit
echo.
echo %BLUE%===================================================================%RESET%
echo.

set "choice="
set /p choice="Enter selection [1-9, C, R, A, 0]: "
if defined choice set "choice=!choice: =!"

if /i "!choice!"=="1" goto check_node
if /i "!choice!"=="2" goto check_git
if /i "!choice!"=="3" goto configure_execution_policy
if /i "!choice!"=="4" goto gitpull_update
if /i "!choice!"=="5" goto install_dependencies
if /i "!choice!"=="6" goto setup_env
if /i "!choice!"=="7" goto run_devel
if /i "!choice!"=="8" goto run_build
if /i "!choice!"=="9" goto run_prod
if /i "!choice!"=="C" goto clean_reinstall
if /i "!choice!"=="R" goto refresh_all
if /i "!choice!"=="A" goto about_project
if /i "!choice!"=="0" goto exit_prog
if /i "!choice!"=="Q" goto exit_prog

echo.
echo %RED%Invalid selection, please try again.%RESET%
ping 127.0.0.1 -n 2 > nul
goto menu

:: -------------------------------------------------------------------
:: 3. Configuration & Autodetection
:: -------------------------------------------------------------------
:init_config
for %%I in ("%CD%") do set "FOLDER_NAME=%%~nxI"

set "CFG_TITLE="
set "CFG_SUBTITLE="
set "CFG_DEV_URL="
set "CFG_PROD_URL="
set "CFG_OPEN_BROWSER=true"
set "CFG_BUILD_DIR="
set "CFG_DEV_CMD=npm run dev"
set "CFG_BUILD_CMD=npm run build"
set "CFG_PROD_CMD="
set "CFG_INSTALL_CMD=npm install"

set "CONFIG_FILE="
if exist "ProjectRunner.ini" set "CONFIG_FILE=ProjectRunner.ini"
if not defined CONFIG_FILE if exist "runner.ini" set "CONFIG_FILE=runner.ini"

if defined CONFIG_FILE call :parse_ini

set "PKG_NAME="
set "IS_VITE=0"
set "IS_NEXT=0"
set "IS_CRA=0"
set "DETECTED_TYPE=NodeJS"
set "DEFAULT_PORT=3000"
set "DEFAULT_BUILD_DIR=dist"
set "DEFAULT_PROD_CMD=npm run start"

if exist "package.json" call :detect_package

if "!IS_VITE!"=="1" (
    set "DETECTED_TYPE=Vite"
    set "DEFAULT_PORT=5173"
    set "DEFAULT_BUILD_DIR=dist"
    set "DEFAULT_PROD_CMD=npm run preview"
    goto :finalize_types
)

if "!IS_NEXT!"=="1" (
    set "DETECTED_TYPE=Next.js"
    set "DEFAULT_PORT=3000"
    set "DEFAULT_BUILD_DIR=.next"
    set "DEFAULT_PROD_CMD=npm run start"
    goto :finalize_types
)

if "!IS_CRA!"=="1" (
    set "DETECTED_TYPE=Create React App"
    set "DEFAULT_PORT=3000"
    set "DEFAULT_BUILD_DIR=build"
    set "DEFAULT_PROD_CMD=npm run start"
    goto :finalize_types
)

if exist ".next" (
    set "DEFAULT_BUILD_DIR=.next"
) else if exist "build" (
    set "DEFAULT_BUILD_DIR=build"
) else (
    set "DEFAULT_BUILD_DIR=dist"
)

:finalize_types
if defined CFG_TITLE (
    set "PROJECT_TITLE=!CFG_TITLE!"
) else if defined PKG_NAME (
    set "PROJECT_TITLE=!PKG_NAME!"
) else (
    set "PROJECT_TITLE=!FOLDER_NAME!"
)

if defined CFG_SUBTITLE (
    set "PROJECT_SUBTITLE=!CFG_SUBTITLE!"
) else (
    set "PROJECT_SUBTITLE=Type: !DETECTED_TYPE! project"
)

if defined CFG_BUILD_DIR (
    set "BUILD_DIR=!CFG_BUILD_DIR!"
) else (
    set "BUILD_DIR=!DEFAULT_BUILD_DIR!"
)

if defined CFG_DEV_URL (
    set "DEV_URL=!CFG_DEV_URL!"
) else (
    set "DEV_URL=http://localhost:!DEFAULT_PORT!"
)

if defined CFG_PROD_URL (
    set "PROD_URL=!CFG_PROD_URL!"
) else (
    set "PROD_URL=http://localhost:!DEFAULT_PORT!"
)

set "DEV_CMD=!CFG_DEV_CMD!"
set "BUILD_CMD=!CFG_BUILD_CMD!"
if defined CFG_PROD_CMD (
    set "PROD_CMD=!CFG_PROD_CMD!"
) else (
    set "PROD_CMD=!DEFAULT_PROD_CMD!"
)
set "INSTALL_CMD=!CFG_INSTALL_CMD!"
set "OPEN_BROWSER=!CFG_OPEN_BROWSER!"

exit /b

:parse_ini
for /f "usebackq eol=; tokens=1,* delims==" %%A in ("!CONFIG_FILE!") do (
    set "k=%%A"
    set "v=%%B"
    for /f "tokens=* delims= " %%K in ("!k!") do set "k=%%K"
    set "chk=!k:~0,1!"
    if not "!chk!"=="[" if not "!chk!"=="#" (
        if defined v for /f "tokens=* delims= " %%V in ("!v!") do set "v=%%V"
        for /l %%i in (1,1,10) do if "!k:~-1!"==" " set "k=!k:~0,-1!"

        if /i "!k!"=="Title" set "CFG_TITLE=!v!"
        if /i "!k!"=="PROJECT_NAME" set "CFG_TITLE=!v!"
        if /i "!k!"=="Subtitle" set "CFG_SUBTITLE=!v!"
        if /i "!k!"=="PROJECT_DESC" set "CFG_SUBTITLE=!v!"
        if /i "!k!"=="DevUrl" set "CFG_DEV_URL=!v!"
        if /i "!k!"=="ProdUrl" set "CFG_PROD_URL=!v!"
        if /i "!k!"=="OpenBrowser" set "CFG_OPEN_BROWSER=!v!"
        if /i "!k!"=="BuildDir" set "CFG_BUILD_DIR=!v!"
        if /i "!k!"=="DevCommand" set "CFG_DEV_CMD=!v!"
        if /i "!k!"=="BuildCommand" set "CFG_BUILD_CMD=!v!"
        if /i "!k!"=="ProdCommand" set "CFG_PROD_CMD=!v!"
        if /i "!k!"=="InstallCommand" set "CFG_INSTALL_CMD=!v!"
    )
)
exit /b

:detect_package
findstr /i "vite" package.json >nul 2>&1
if !errorlevel! equ 0 set "IS_VITE=1"

findstr /i "next" package.json >nul 2>&1
if !errorlevel! equ 0 set "IS_NEXT=1"

findstr /i "react-scripts" package.json >nul 2>&1
if !errorlevel! equ 0 set "IS_CRA=1"

for /f "tokens=2 delims=:, " %%A in ('findstr /i "\"name\":" package.json 2^>nul') do (
    if not defined PKG_NAME (
        set "PKG_NAME=%%~A"
        set "PKG_NAME=!PKG_NAME:"=!"
    )
)
exit /b

:: -------------------------------------------------------------------
:: 4. Status Checks
:: -------------------------------------------------------------------
:silent_check
where node >nul 2>nul
set "HAS_NODE=!errorlevel!"
where npm >nul 2>nul
set "HAS_NPM=!errorlevel!"
if !HAS_NODE! equ 0 (
    if !HAS_NPM! equ 0 (
        set "NdJSava=%CHECK%"
    ) else (
        set "NdJSava=%CROSS%"
    )
) else (
    set "NdJSava=%CROSS%"
)

where git >nul 2>nul
if !errorlevel! neq 0 (
    set "Git_ava=%CROSS%"
    set "IS_GIT=0"
    set "latestv=%CROSS%"
) else (
    if exist ".git" (
        set "Git_ava=%CHECK%"
        set "IS_GIT=1"
        if not defined latestv set "latestv=%EMPTY%"
    ) else (
        set "Git_ava=%NA_BADGE%"
        set "IS_GIT=0"
        set "latestv=%NA_BADGE%"
    )
)

set "CURRENT_POLICY="
for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "Get-ExecutionPolicy" 2^>nul`) do (
    set "CURRENT_POLICY=%%i"
)
if /i "!CURRENT_POLICY!"=="Restricted" (
    set "ps_exec=%CROSS%"
) else (
    set "ps_exec=%CHECK%"
)

set "ENV_STATUS=NONE"
set "ENV_TEMPLATE="
if exist ".env" (
    set "env_stat=%CHECK%"
    set "ENV_STATUS=OK"
) else (
    if exist ".env.example" (
        set "env_stat=%WARNI%"
        set "ENV_STATUS=TEMPLATE"
        set "ENV_TEMPLATE=.env.example"
    ) else if exist ".env.sample" (
        set "env_stat=%WARNI%"
        set "ENV_STATUS=TEMPLATE"
        set "ENV_TEMPLATE=.env.sample"
    ) else if exist ".env.template" (
        set "env_stat=%WARNI%"
        set "ENV_STATUS=TEMPLATE"
        set "ENV_TEMPLATE=.env.template"
    ) else (
        set "env_stat=%EMPTY%"
        set "ENV_STATUS=NONE"
    )
)

if exist "node_modules" (
    set "depenOK=%CHECK%"
    set "run_dev=%PLAYG%"
) else (
    set "depenOK=%CROSS%"
    set "run_dev=%CROSS%"
)

if exist "!BUILD_DIR!" (
    set "builtOK=%CHECK%"
    set "runprod=%PLAYG%"
) else (
    set "builtOK=%CROSS%"
    set "runprod=%CROSS%"
)

exit /b

:: -------------------------------------------------------------------
:: 5. Action Handlers
:: -------------------------------------------------------------------

:check_node
cls
echo %BLUE%#### #### CHECKING NODEJS ^& NPM #### ####%RESET%
echo.
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo %RED%[✗] Node.js was not found in your system PATH.%RESET%
    echo.
    echo Please install Node.js from: %CYAN%https://nodejs.org/%RESET%
    echo Recommended version: %GREEN%NodeJS LTS%RESET%
) else (
    echo %GREEN%[✓] Node.js and npm are available.%RESET%
    echo.
    for /f "usebackq" %%v in (`node -v`) do set "NODE_VER=%%v"
    for /f "usebackq" %%v in (`npm -v`) do set "NPM_VER=%%v"
    echo   Node.js version : %GREEN%!NODE_VER!%RESET%
    echo   npm version     : %GREEN%!NPM_VER!%RESET%
    for /f "usebackq delims=" %%p in (`where node`) do echo   Node.js path    : %GRAY%%%p%RESET%
)
echo.
echo %BLUE%===================================================================%RESET%
echo.
pause
goto menu

:check_git
cls
echo %BLUE%#### #### CHECKING GIT ENVIRONMENT #### ####%RESET%
echo.
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo %RED%[✗] Git CLI is not found in your system PATH.%RESET%
    echo.
    echo Please install Git from: %CYAN%https://git-scm.com/downloads%RESET%
) else (
    for /f "usebackq tokens=3" %%v in (`git --version`) do set "GIT_VER=%%v"
    echo %GREEN%[✓] Git is installed%RESET% ^(version: %GREEN%!GIT_VER!%RESET%^)
    echo.
    if exist ".git" (
        echo   Repository state : %GREEN%Active Git repository ^(.git found^)%RESET%
        for /f "usebackq" %%b in (`git branch --show-current 2^>nul`) do set "GIT_BRANCH=%%b"
        if defined GIT_BRANCH echo   Current branch   : %CYAN%!GIT_BRANCH!%RESET%
    ) else (
        echo   Repository state : %YELLOW%Non-Git project ^(missing .git directory^)%RESET%
        echo   %GRAY%Notice: If this project was downloaded as a ZIP archive from GitHub,%RESET%
        echo   %GRAY%git version tracking and 'git pull' are disabled.%RESET%
    )
)
echo.
echo %BLUE%===================================================================%RESET%
echo.
pause
goto menu

:configure_execution_policy
cls
echo %BLUE%#### #### POWERSHELL EXECUTION POLICY #### ####%RESET%
echo.
for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "Get-ExecutionPolicy" 2^>nul`) do (
    set "CURRENT_POLICY=%%i"
)
echo Current execution policy: %CYAN%!CURRENT_POLICY!%RESET%
echo.
if /i "!CURRENT_POLICY!"=="Restricted" (
    echo %YELLOW%PowerShell execution policy is 'Restricted'.%RESET%
    echo This blocks npm wrapper scripts from executing in PowerShell.
    echo.
    echo Setting policy to 'RemoteSigned' for CurrentUser...
    powershell -NoProfile -Command "Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force" 2>nul
    if !errorlevel! equ 0 (
        echo %GREEN%[✓] Execution policy successfully set to RemoteSigned for CurrentUser.%RESET%
    ) else (
        echo %RED%[✗] Failed to update execution policy automatically.%RESET%
        echo Try running PowerShell as Administrator and run:
        echo   Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
    )
) else (
    echo %GREEN%[✓] Policy is already permissive ^(!CURRENT_POLICY!^).%RESET%
    echo No changes needed.
)
echo.
echo %BLUE%===================================================================%RESET%
echo.
set "ps_exec=%CHECK%"
pause
goto menu

:gitpull_update
cls
echo %BLUE%#### #### PULLING LATEST CHANGES FROM GIT #### ####%RESET%
echo.
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo %RED%[✗] Git CLI is required to pull updates.%RESET%
    echo Please run option [2] to check Git installation.
    echo.
    pause
    goto menu
)

if not exist ".git" (
    echo %YELLOW%===================================================================%RESET%
    echo %YELLOW%[!] Git repository not detected ^(.git directory is missing^)%RESET%
    echo %YELLOW%===================================================================%RESET%
    echo.
    echo It appears you downloaded this project as a %BOLD%ZIP archive%RESET% from GitHub.
    echo A ZIP download does not include Git version history or remote tracking.
    echo.
    echo %CYAN%How to update this project:%RESET%
    echo   1. Download the latest ZIP archive from the GitHub repository, OR
    echo   2. Clone the repository properly via Git:
    echo      %BOLD%git clone ^<repository-url^>%RESET%
    echo.
    pause
    goto menu
)

echo Pulling latest changes from remote Git repository...
echo.
call git pull
if !errorlevel! equ 0 (
    echo.
    echo %GREEN%[✓] Git pull completed successfully.%RESET%
    set "latestv=%CHECK%"
    set "depenOK=%WARNI%"
) else (
    echo.
    echo %RED%[✗] Git pull encountered errors. Please check your network or branch state.%RESET%
    set "latestv=%CROSS%"
)
echo.
echo %BLUE%===================================================================%RESET%
echo.
pause
goto menu

:install_dependencies
cls
echo %BLUE%#### #### INSTALLING DEPENDENCIES #### ####%RESET%
echo.
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo %RED%[✗] Node.js/npm is required to install dependencies.%RESET%
    echo Please install Node.js first.
    echo.
    pause
    goto menu
)

echo Running: %CYAN%!INSTALL_CMD!%RESET%
echo Please wait, this may take a moment...
echo.
call !INSTALL_CMD!
if !errorlevel! equ 0 (
    echo.
    echo %GREEN%[✓] Dependencies installed successfully.%RESET%
    set "depenOK=%CHECK%"
    set "run_dev=%PLAYG%"
) else (
    echo.
    echo %RED%[✗] npm install failed. Check npm error logs above.%RESET%
    set "depenOK=%CROSS%"
)
echo.
echo %BLUE%===================================================================%RESET%
echo.
pause
goto menu

:setup_env
cls
echo %BLUE%#### #### ENVIRONMENT CONFIGURATION (.env) #### ####%RESET%
echo.
if exist ".env" (
    echo %GREEN%[✓] Active '.env' file is present.%RESET%
    echo.
    echo Options:
    echo   [V] View current .env contents
    echo   [O] Open .env in default editor ^(Notepad^)
    echo   [B] Back to main menu
    echo.
    set "env_choice="
    set /p env_choice="Select [V, O, B]: "
    if /i "!env_choice!"=="V" (
        echo.
        echo %CYAN%--- .env Contents ---%RESET%
        type ".env"
        echo.
        echo %CYAN%-----------------------%RESET%
        pause
    )
    if /i "!env_choice!"=="O" (
        start notepad ".env"
    )
    goto menu
)

echo %YELLOW%[!] No active '.env' file found.%RESET%
echo.

if defined ENV_TEMPLATE (
    echo Template file found: %GREEN%!ENV_TEMPLATE!%RESET%
    echo.
    set "create_env="
    set /p create_env="Create '.env' by copying from '!ENV_TEMPLATE!'? [Y/N]: "
    if /i "!create_env!"=="Y" (
        copy "!ENV_TEMPLATE!" ".env" >nul
        if !errorlevel! equ 0 (
            echo %GREEN%[✓] '.env' created successfully from !ENV_TEMPLATE!.%RESET%
            echo.
            set "open_now="
            set /p open_now="Open '.env' now in Notepad for editing? [Y/N]: "
            if /i "!open_now!"=="Y" start notepad ".env"
        ) else (
            echo %RED%[✗] Failed to copy !ENV_TEMPLATE! to .env.%RESET%
        )
    )
) else (
    echo No template (.env.example) found in this folder.
    echo.
    set "create_blank="
    set /p create_blank="Create a new empty '.env' file? [Y/N]: "
    if /i "!create_blank!"=="Y" (
        type nul > ".env"
        echo %GREEN%[✓] Empty '.env' created.%RESET%
        start notepad ".env"
    )
)

echo.
echo %BLUE%===================================================================%RESET%
echo.
pause
goto menu

:run_devel
cls
echo %BLUE%#### #### STARTING DEVELOPMENT SERVER #### ####%RESET%
echo.
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo %RED%[✗] Node.js/npm is required to run the development server.%RESET%
    pause
    goto menu
)

if not exist "node_modules" (
    echo %YELLOW%[!] Warning: 'node_modules' folder not found.%RESET%
    echo Dependencies might not be installed. Recommended: run option [5] first.
    echo.
)

echo Starting: %CYAN%!DEV_CMD!%RESET%
echo Target URL : %GREEN%!DEV_URL!%RESET%
echo.
echo Server is starting up.
echo Press %YELLOW%Ctrl+C%RESET% to terminate the server and return to this menu.
echo.

if /i not "!OPEN_BROWSER!"=="false" (
    if defined DEV_URL (
        echo Opening %CYAN%!DEV_URL!%RESET% in your default browser...
        timeout /t 2 > nul
        start "" "!DEV_URL!"
    )
)

call !DEV_CMD!
echo.
echo %BLUE%===================================================================%RESET%
echo Development server stopped.
pause
goto menu

:run_build
cls
echo %BLUE%#### #### BUILDING PRODUCTION BUNDLE #### ####%RESET%
echo.
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo %RED%[✗] Node.js/npm is required to build the application.%RESET%
    pause
    goto menu
)

echo Running: %CYAN%!BUILD_CMD!%RESET%
echo Target build output: %YELLOW%!BUILD_DIR!%RESET%
echo Please wait...
echo.
call !BUILD_CMD!
if !errorlevel! equ 0 (
    echo.
    echo %GREEN%[✓] Production build completed successfully.%RESET%
    set "builtOK=%CHECK%"
    set "runprod=%PLAYG%"
) else (
    echo.
    echo %RED%[✗] Build failed. Review errors above.%RESET%
    set "builtOK=%CROSS%"
)
echo.
echo %BLUE%===================================================================%RESET%
echo.
pause
goto menu

:run_prod
cls
echo %BLUE%#### #### STARTING PRODUCTION SERVER #### ####%RESET%
echo.
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo %RED%[✗] Node.js/npm is required to run the production server.%RESET%
    pause
    goto menu
)

if not exist "!BUILD_DIR!" (
    echo %RED%#### #### BUILD OUTPUT NOT FOUND #### ####%RESET%
    echo.
    echo The build folder '%YELLOW%!BUILD_DIR!%RESET%' was not found.
    echo Please build the application first using option [%CYAN%8%RESET%].
    echo.
    pause
    goto menu
)

echo Starting: %CYAN%!PROD_CMD!%RESET%
echo Target URL : %GREEN%!PROD_URL!%RESET%
echo.
echo Server is starting up.
echo Press %YELLOW%Ctrl+C%RESET% to terminate the server and return to this menu.
echo.

if /i not "!OPEN_BROWSER!"=="false" (
    if defined PROD_URL (
        echo Opening %CYAN%!PROD_URL!%RESET% in your default browser...
        timeout /t 2 > nul
        start "" "!PROD_URL!"
    )
)

call !PROD_CMD!
echo.
echo %BLUE%===================================================================%RESET%
echo Production server stopped.
pause
goto menu

:clean_reinstall
cls
echo %YELLOW%#### #### CLEAN ^& REINSTALL DEPENDENCIES #### ####%RESET%
echo.
echo %RED%WARNING:%RESET% This operation will delete the %BOLD%node_modules%RESET% folder
echo and run a clean %CYAN%!INSTALL_CMD!%RESET%.
echo.
set "clean_confirm="
set /p clean_confirm="Are you sure you want to proceed? [Y/N]: "
if /i not "!clean_confirm!"=="Y" (
    echo Operation cancelled.
    ping 127.0.0.1 -n 2 > nul
    goto menu
)

echo.
if exist "node_modules" (
    echo Deleting 'node_modules' folder, please wait...
    rd /s /q "node_modules" 2>nul
    if exist "node_modules" (
        echo %RED%Failed to delete node_modules entirely ^(some files may be locked by another process^).%RESET%
    ) else (
        echo %GREEN%[✓] node_modules removed.%RESET%
    )
) else (
    echo 'node_modules' was not present.
)

echo.
echo Reinstalling dependencies using: %CYAN%!INSTALL_CMD!%RESET%
call !INSTALL_CMD!
echo.
echo %GREEN%[✓] Clean install process finished.%RESET%
echo.
echo %BLUE%===================================================================%RESET%
echo.
pause
goto menu

:about_project
cls
echo %BLUE%===================================================================%RESET%
echo %BOLD%About ProjectRunner%RESET%
echo.
echo ProjectRunner is a universal, interactive CMD runner and diagnostic
echo script for NodeJS projects on Windows. It provides a simple, colorful
echo interface for starting dev/prod servers, managing dependencies,
echo and validating your environment.
echo.
echo GitHub Repository: %CYAN%https://github.com/roboraptor/cmd-njs-runner/%RESET%
echo %BLUE%===================================================================%RESET%
echo.
pause
goto menu

:refresh_all
call :init_config
call :silent_check
echo Configuration reloaded.
ping 127.0.0.1 -n 2 > nul
goto menu

:exit_prog
cls
echo %CYAN%Thank you for using ProjectRunner!%RESET%
ping 127.0.0.1 -n 2 > nul
exit /b 0
