@echo off
set "QINGTIAN_PYTHON=%~dp0..\cross-sensory-live-music\experiments\experiment-v2\.venv\Scripts\python.exe"
if not exist "%QINGTIAN_PYTHON%" set "QINGTIAN_PYTHON=python"
"%QINGTIAN_PYTHON%" "%~dp0Tools\launch.py"
if errorlevel 1 pause
