// Simple PowerShell test script for database creation
$baseUrl = "http://localhost:3001/api"

Write-Host "Testing Database Creation with User Credentials..." -ForegroundColor Cyan

# Test users
$users = @(
    @{ email = "testuser@example.com"; password = "password123" },
    @{ email = "testuser2@example.com"; password = "password123" }
)

foreach ($user in $users) {
    Write-Host "`nTesting with user: $($user.email)" -ForegroundColor Yellow
    
    try {
        # Login
        $loginBody = @{
            email = $user.email
            password = $user.password
        } | ConvertTo-Json
        
        $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
        $token = $loginResponse.token
        Write-Host "Login successful" -ForegroundColor Green
        
        # Check SQL Server credentials
        $headers = @{ Authorization = "Bearer $token" }
        $credsResponse = Invoke-RestMethod -Uri "$baseUrl/sqlserver/credentials" -Headers $headers
        Write-Host "SQL Server username: $($credsResponse.username)" -ForegroundColor Green
        
        # Try to create test database
        $dbName = "test_db_$($user.email.Split('@')[0])_$(Get-Date -Format 'yyyyMMddHHmmss')"
        Write-Host "Attempting to create database: $dbName" -ForegroundColor Cyan
        
        $createDbBody = @{
            name = $dbName
            collation = "SQL_Latin1_General_CP1_CI_AS"
        } | ConvertTo-Json
        
        try {
            $createResponse = Invoke-RestMethod -Uri "$baseUrl/databases" -Method POST -Body $createDbBody -Headers $headers -ContentType "application/json"
            Write-Host "SUCCESS! Database created: $($createResponse.message)" -ForegroundColor Green
            
            # List databases to verify
            $listResponse = Invoke-RestMethod -Uri "$baseUrl/databases/list" -Headers $headers
            Write-Host "User now has $($listResponse.data.Length) database(s):" -ForegroundColor Green
            $listResponse.data | ForEach-Object { Write-Host "  - $($_.name)" }
            
        } catch {
            $errorResponse = $_.Exception.Response
            if ($errorResponse) {
                $errorStream = $errorResponse.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($errorStream)
                $errorBody = $reader.ReadToEnd() | ConvertFrom-Json
                Write-Host "FAILED: $($errorBody.message)" -ForegroundColor Red
                if ($errorBody.details) {
                    Write-Host "Details: $($errorBody.details)" -ForegroundColor Red
                }
            } else {
                Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
        
    } catch {
        Write-Host "Login failed for $($user.email): $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nTest completed." -ForegroundColor Cyan
