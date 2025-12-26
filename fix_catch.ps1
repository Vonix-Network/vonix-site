
Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($null -ne $content) {
        $newContent = $content -replace 'catch\s*\(error\)\s*\{', 'catch (error: any) {'
        $newContent = $newContent -replace 'catch\s*\(e\)\s*\{', 'catch (e: any) {'
        $newContent = $newContent -replace 'catch\s*\(err\)\s*\{', 'catch (err: any) {'
        
        if ($content -ne $newContent) {
            Set-Content -Path $_.FullName -Value $newContent -NoNewline
            Write-Host "Updated $($_.Name)"
        }
    }
}
