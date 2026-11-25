; The Explorer's entries of Glup (right click and "Enviar a"), per user. Glup writes and removes them
; itself (services/explorer), so the list of options always matches tools.json.

!macro NSIS_HOOK_POSTINSTALL
  ; As the settings say: a new install has none, so both go in. An update writes them with the new path.
  ExecWait '"$INSTDIR\${MAINBINARYNAME}.exe" --install-shell'
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  ; Before the files go, while Glup is still there to take its entries out.
  ExecWait '"$INSTDIR\${MAINBINARYNAME}.exe" --uninstall-shell'
  ; In case Glup could not run: the shortcut of "Enviar a" goes anyway.
  Delete "$APPDATA\Microsoft\Windows\SendTo\Glup.lnk"
!macroend
