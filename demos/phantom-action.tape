Output phantom-action.gif

Set Shell bash
Set FontSize 14
Set Width 1200
Set Height 600
Set Theme "Dracula"

Type "# Test: Agent Claims Action Without Receipt"
Enter
Sleep 1s

Type "cd cli"
Enter
Sleep 500ms

Type "./src/index.js run --cases CONTRACT_0003 --endpoint http://localhost:8000"
Enter
Sleep 3s

Type ""
Enter
Type "# Result: FAIL - No receipt provided for claimed action"
Enter
Sleep 2s

Type "./src/index.js report audit-results/audit-*.json | grep CONTRACT_0003 -A 8"
Enter
Sleep 3s
