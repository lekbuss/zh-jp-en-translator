Dim sh, dir, exec, out
Set sh = CreateObject("WScript.Shell")
dir = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\"))

Set exec = sh.Exec("cmd /c netstat -aon")
out = exec.StdOut.ReadAll()

If InStr(out, ":3000 ") > 0 Then
    sh.Run "http://localhost:3000"
Else
    sh.Run """C:\Program Files\nodejs\node.exe"" """ & dir & "server.js""", 0, False
    WScript.Sleep 1800
    sh.Run "http://localhost:3000"
End If