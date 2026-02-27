# Windows Task Scheduler Setup for Daily SMS Reminders
# Run as Administrator in PowerShell
# PowerShell -ExecutionPolicy Bypass -File setup-daily-reminders.ps1

Write-Host "🔔 Setting up Daily SMS Reminders..." -ForegroundColor Green
Write-Host ""

# Check if running as Administrator
$isAdmin = ([System.Security.Principal.WindowsIdentity]::GetCurrent().Groups -contains 'S-1-5-32-544')
if (-not $isAdmin) {
    Write-Host "❌ Please run PowerShell as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell → Run as administrator" -ForegroundColor Yellow
    exit 1
}

# Configuration
$taskName = "Barber Shop Daily SMS Reminders"
$scriptPath = "c:\generic-barber25\generic-barber\daily-reminder.js"
$nodePath = "node"  # Assumes node is in PATH, or use full path like "C:\Program Files\nodejs\node.exe"
$time = "10:00"     # 10 AM

# Verify script exists
if (-not (Test-Path $scriptPath)) {
    Write-Host "❌ Script not found: $scriptPath" -ForegroundColor Red
    exit 1
}

# Verify Node.js is installed
$nodeCheck = & $nodePath --version 2>$null
if (-not $nodeCheck) {
    Write-Host "❌ Node.js not found in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Node.js version: $nodeCheck" -ForegroundColor Green
Write-Host ""

# Remove existing task if it exists
Write-Host "🔄 Checking for existing task..." -ForegroundColor Cyan
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "⚠️  Task already exists - updating..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false | Out-Null
}

# Create task trigger (daily at 10 AM)
$trigger = New-ScheduledTaskTrigger -Daily -At $time

# Create task action
$action = New-ScheduledTaskAction `
    -Execute $nodePath `
    -Argument """$scriptPath""" `
    -WorkingDirectory "c:\generic-barber25\generic-barber"

# Create task settings
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable

# Register the task
Write-Host "📝 Creating scheduled task..." -ForegroundColor Cyan
Register-ScheduledTask `
    -TaskName $taskName `
    -Trigger $trigger `
    -Action $action `
    -Settings $settings `
    -Description "Sends SMS reminders for appointments tomorrow at 10 AM" `
    -RunLevel Highest | Out-Null

Write-Host ""
Write-Host "✅ SETUP COMPLETE!" -ForegroundColor Green
Write-Host ""
Write-Host "Task Details:" -ForegroundColor Cyan
Write-Host "  Task Name:  $taskName"
Write-Host "  Time:       $time AM (daily)"
Write-Host "  Script:     $scriptPath"
Write-Host ""

# Verify task was created
$task = Get-ScheduledTask -TaskName $taskName
if ($task) {
    Write-Host "📋 Task Status:" -ForegroundColor Green
    Write-Host "  State:      $($task.State)"
    Write-Host "  Enabled:    $($task.Enabled)"
    Write-Host ""
    Write-Host "🧪 Testing task (running now)..." -ForegroundColor Yellow
    Start-ScheduledTask -TaskName $taskName
    Start-Sleep -Seconds 3
    
    Write-Host ""
    Write-Host "✅ Task created and executed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📱 Check your phone for test SMS (if any appointments for tomorrow)" -ForegroundColor Cyan
    Write-Host "📊 View task history: Task Scheduler → Task Scheduler Library" -ForegroundColor Cyan
} else {
    Write-Host "❌ Failed to create task!" -ForegroundColor Red
    exit 1
}
