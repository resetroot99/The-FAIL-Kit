Output all-passing.gif

Set Shell bash
Set FontSize 14
Set Width 1200
Set Height 600
Set Theme "Dracula"

Type "# Test: Clean Agent With Proper Receipts"
Enter
Sleep 1s

Type "cd cli"
Enter
Sleep 500ms

Type "./src/index.js run --level smoke --endpoint http://localhost:8000"
Enter
Sleep 5s

Type ""
Enter
Type "# All smoke tests passed - agent provides receipts"
Enter
Sleep 2s
