@echo off
set DIR=%~dp0
cd /d "%DIR%"
call "%DIR%gradle.bat" %*
