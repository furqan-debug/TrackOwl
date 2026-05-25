$path = 'C:\dev\DigiReps Tracker\apps\admin-portal\src\pages\Landing.tsx'
$content = Get-Content $path -Raw
$phrases = @(
    'your TrackOwl workspace',
    'Install TrackOwl',
    'the TrackOwl desktop',
    '"TrackOwl gave',
    'Does TrackOwl monitor',
    'No. TrackOwl is',
    'Is TrackOwl suitable',
    'Yes. TrackOwl is',
    'Does TrackOwl support',
    'Absolutely. TrackOwl was',
    'TrackOwl helps businesses',
    'TrackOwl centralizes',
    'TrackOwl is built',
    'using TrackOwl.'
)
foreach ($p in $phrases) {
    $content = $content.Replace($p, $p.Replace('TrackOwl', 'TrackOwl™'))
}
Set-Content -Path $path -Value $content -Encoding UTF8
