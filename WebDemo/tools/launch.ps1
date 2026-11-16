$ErrorActionPreference = 'Stop'
$demoRoot = Split-Path -Parent $PSScriptRoot
$nodeCommand = Get-Command node.exe -ErrorAction Stop
Start-Process -FilePath $nodeCommand.Source -ArgumentList @('server.mjs','--open') -WorkingDirectory $demoRoot -WindowStyle Hidden
