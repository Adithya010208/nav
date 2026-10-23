param([Parameter(Mandatory=$true)][string]$OutputPath)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Speech
$voiceFixtureSynth=[System.Speech.Synthesis.SpeechSynthesizer]::new()
try {
    $voiceFixtureEnglish=@($voiceFixtureSynth.GetInstalledVoices() | Where-Object {$_.Enabled -and $_.VoiceInfo.Culture.Name.StartsWith('en')})
    if($voiceFixtureEnglish.Count -gt 0){$voiceFixtureSynth.SelectVoice($voiceFixtureEnglish[0].VoiceInfo.Name)}
    $voiceFixtureFormat=[System.Speech.AudioFormat.SpeechAudioFormatInfo]::new(16000,[System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen,[System.Speech.AudioFormat.AudioChannel]::Mono)
    $voiceFixtureSynth.SetOutputToWaveFile([System.IO.Path]::GetFullPath($OutputPath),$voiceFixtureFormat)
    $voiceFixtureSynth.Speak('Help me revise maths for tomorrow.')
} finally {$voiceFixtureSynth.Dispose()}
Write-Output 'Fixed synthetic speech fixture created. No microphone or user audio was used.'
