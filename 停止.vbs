Dim sh, exec, pid
Set sh = CreateObject("WScript.Shell")
Set exec = sh.Exec("cmd /c for /f ""tokens=5"" %a in ('netstat -aon ^| findstr :3000') do @echo %a")
pid = Trim(exec.StdOut.ReadAll())
If pid <> "" Then
    sh.Run "taskkill /f /pid " & pid, 0, True
    MsgBox "Server stopped.", 64, "OK"
Else
    MsgBox "Server is not running.", 48, "Info"
End If