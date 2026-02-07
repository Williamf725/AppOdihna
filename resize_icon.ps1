# Script to resize and center the app icon with safe margins
Add-Type -AssemblyName System.Drawing

$inputPath = "d:\APPODIHNA\MiAppAirbnb\assets\images\icon.png"
$outputPath = "d:\APPODIHNA\MiAppAirbnb\assets\images\icon_safe.png"
$backupPath = "d:\APPODIHNA\MiAppAirbnb\assets\images\icon_original_backup.png"

# Canvas size and logo scale (75% of canvas = 25% total margin)
$canvasSize = 1024
$logoScale = 0.75
$logoSize = [int]($canvasSize * $logoScale)  # 768 pixels
$offset = [int](($canvasSize - $logoSize) / 2)  # 128 pixels on each side

Write-Host "Loading original icon..."
$original = [System.Drawing.Image]::FromFile($inputPath)

Write-Host "Creating new canvas ($canvasSize x $canvasSize)..."
$bitmap = New-Object System.Drawing.Bitmap($canvasSize, $canvasSize)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)

# Fill with black background
$graphics.Clear([System.Drawing.Color]::Black)

# High quality rendering
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

Write-Host "Drawing logo centered at $offset,$offset with size $logoSize x $logoSize..."
$destRect = New-Object System.Drawing.Rectangle($offset, $offset, $logoSize, $logoSize)
$srcRect = New-Object System.Drawing.Rectangle(0, 0, $original.Width, $original.Height)
$graphics.DrawImage($original, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

# Cleanup
$graphics.Dispose()
$original.Dispose()

# Backup original
Write-Host "Backing up original icon..."
Copy-Item $inputPath $backupPath -Force

# Save new icon
Write-Host "Saving new icon..."
$bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bitmap.Dispose()

# Replace original with new
Write-Host "Replacing original with resized icon..."
Copy-Item $outputPath $inputPath -Force

Write-Host "Done! Icon resized with safe margins."
Write-Host "- Original backed up to: $backupPath"
Write-Host "- New icon saved to: $inputPath"
