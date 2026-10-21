$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Speech
$videoRoot=Join-Path (Get-Location) 'presentacion/video-simulacion'
$scenes=Get-Content (Join-Path $videoRoot 'fuentes/escenas.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$audioFolder=Join-Path $videoRoot 'revision/audio'
New-Item -ItemType Directory -Path $audioFolder -Force | Out-Null
$speaker=New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
 $speaker.SelectVoice('Microsoft Helena Desktop')
 $speaker.Rate=0
 for($index=0;$index -lt $scenes.Count;$index++) {
  $speaker.SetOutputToWaveFile((Join-Path $audioFolder ('voz-{0:00}.wav' -f ($index+1))))
  $speaker.Speak($scenes[$index].voice)
 }
 $speaker.SetOutputToNull()
} finally {$speaker.Dispose()}
Write-Output ('Narraciones creadas: '+$scenes.Count)
