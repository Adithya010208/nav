param(
    [Parameter(Mandatory=$true)][string]$Adb,
    [string]$Serial,
    [switch]$Install
)
$ErrorActionPreference='Stop'
function Invoke-AdbChecked([string[]]$Arguments) {
    $pinfo = New-Object System.Diagnostics.ProcessStartInfo
    $pinfo.FileName = $Adb
    $pinfo.Arguments = ($Arguments | ForEach-Object { if ($_ -match '\s') { "`"$_`"" } else { $_ } }) -join ' '
    $pinfo.RedirectStandardOutput = $true
    $pinfo.RedirectStandardError = $true
    $pinfo.UseShellExecute = $false
    $pinfo.CreateNoWindow = $true
    $p = [System.Diagnostics.Process]::Start($pinfo)
    $stdout = $p.StandardOutput.ReadToEnd()
    $stderr = $p.StandardError.ReadToEnd()
    $p.WaitForExit()
    if ($p.ExitCode -ne 0) { throw "ADB operation failed (exit code $($p.ExitCode)): $stdout $stderr" }
    return ($stdout + "`n" + $stderr)
}
$devices=Invoke-AdbChecked @('devices')
$ready=@($devices -split "`n" | Where-Object { $_ -match '^\S+\s+device\s*$' } | ForEach-Object { ($_ -split '\s+')[0] })
if($Serial) { if($ready -notcontains $Serial){throw 'Selected phone is absent or has not authorized debugging.'} }
elseif($ready.Count -eq 1){$Serial=$ready[0]}
else{throw 'Connect exactly one authorized phone, or select an authorized phone with -Serial.'}
$prefix=@('-s',$Serial)
$main=Join-Path $PSScriptRoot 'app/build/outputs/apk/debug/app-debug.apk'
$test=Join-Path $PSScriptRoot 'app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk'
if(!(Test-Path -LiteralPath $test)){throw 'Build assembleDebugAndroidTest first.'}
if($Install){
    if(!(Test-Path -LiteralPath $main)){throw 'Build assembleDebug first.'}
    Invoke-AdbChecked ($prefix+@('install','-r',$main)) | Out-Null
}
# Never clear the main app, grant permissions, or change its college preferences.
Invoke-AdbChecked ($prefix+@('install','-r',$test)) | Out-Null
try {
    $result=Invoke-AdbChecked ($prefix+@('shell','am','instrument','-w','app.nav.companion.test/app.nav.companion.InboxChecks'))
    if($result -notmatch 'PASS: 53 Android notification isolation/retention checks' -or $result -match 'FAIL:|INSTRUMENTATION_FAILED|Process crashed'){
        throw "Device fixtures did not pass: $result"
    }
    Write-Output 'PASS: 53 isolated Android fixtures. Live task sync and task-reminder delivery still need acceptance checks.'
} finally {
    Invoke-AdbChecked ($prefix+@('uninstall','app.nav.companion.test')) | Out-Null
}
