param(
    [Parameter(Mandatory=$true)][string]$Adb,
    [string]$Serial,
    [switch]$Install
)
$ErrorActionPreference='Stop'
function Invoke-AdbChecked([string[]]$Arguments) {
    $result = & $Adb @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) { throw "ADB operation failed: $($result -join ' ')" }
    return ($result -join "`n")
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
    if($result -notmatch 'PASS: 28 Android notification isolation/retention checks' -or $result -match 'FAIL:|INSTRUMENTATION_FAILED|Process crashed'){
        throw "Device fixtures did not pass: $result"
    }
    Write-Output 'PASS: 28 isolated Android fixtures. Real WhatsApp receipt and reminder delivery still need acceptance checks.'
} finally {
    Invoke-AdbChecked ($prefix+@('uninstall','app.nav.companion.test')) | Out-Null
}
