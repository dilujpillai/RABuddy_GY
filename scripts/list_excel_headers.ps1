$path = "c:\Users\AC48580\OneDrive - Goodyear\Desktop\RISK ASSESSMENT BUDDY SMART 3.0\RA 2025 English Template.xlsx"
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$wb = $excel.Workbooks.Open($path)

Write-Output ("Sheets: " + $wb.Sheets.Count)
foreach ($s in $wb.Sheets) {
    Write-Output ("`nSheet: " + $s.Name)
    $found = $false
    foreach ($r in 1..5) {
        $row = $s.Rows.Item($r)
        $vals = @()
        # Limit to first 30 columns to avoid scanning the whole sheet
        $maxCol = [Math]::Min(30, $row.Columns.Count)
        for ($c = 1; $c -le $maxCol; $c++) {
            $v = $row.Columns.Item($c).Text
            if ($v -ne '') { $vals += $v }
        }
        if ($vals.Count -gt 0) {
            Write-Output ("Header row " + $r + " => " + ($vals -join ', '))
            $found = $true
            break
        }
    }
    if (-not $found) {
        Write-Output 'No headers in first 5 rows'
    }
}

$wb.Close($false)
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
