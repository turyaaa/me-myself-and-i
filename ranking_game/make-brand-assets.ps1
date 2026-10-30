$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies @([System.Drawing.Bitmap].Assembly.Location,[System.Drawing.Rectangle].Assembly.Location) -TypeDefinition @'
using System.Drawing;
public static class LogoBounds {
 public static Rectangle Get(Bitmap image) {
  int left=image.Width, top=image.Height, right=-1, bottom=-1;
  for(int y=0;y<image.Height;y++) for(int x=0;x<image.Width;x++) {
   if(image.GetPixel(x,y).A<20) continue;
   left=System.Math.Min(left,x);top=System.Math.Min(top,y);
   right=System.Math.Max(right,x);bottom=System.Math.Max(bottom,y);
  }
  return right<0 ? new Rectangle(0,0,image.Width,image.Height) : Rectangle.FromLTRB(left,top,right+1,bottom+1);
 }
}
'@
$taskRoot = $PSScriptRoot
$assetRoot = Join-Path $taskRoot 'assets'
[System.IO.Directory]::CreateDirectory($assetRoot) | Out-Null
$source = [System.Drawing.Bitmap]::FromFile('C:\Users\turya\Downloads\The Ranking Game Logo111.png')
$bounds = [LogoBounds]::Get($source)
function Write-LogoIcon([int]$size,[string]$name,[bool]$solid) {
 $bitmap = New-Object System.Drawing.Bitmap($size,$size)
 $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
 $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
 $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
 $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
 if($solid){$graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#2a0f16'))}
 else {$graphics.Clear([System.Drawing.Color]::Transparent)}
 $padding = if($solid){[int]($size*.12)}else{[int]([Math]::Max(1,$size*.035))}
 $scale = [Math]::Min(($size-2*$padding)/$bounds.Width,($size-2*$padding)/$bounds.Height)
 $width=[int]($bounds.Width*$scale);$height=[int]($bounds.Height*$scale)
 $dest=New-Object System.Drawing.Rectangle([int](($size-$width)/2),[int](($size-$height)/2),$width,$height)
 $graphics.DrawImage($source,$dest,$bounds,[System.Drawing.GraphicsUnit]::Pixel)
 $bitmap.Save((Join-Path $assetRoot $name),[System.Drawing.Imaging.ImageFormat]::Png)
 $graphics.Dispose();$bitmap.Dispose()
}
Write-LogoIcon 16 'favicon-16.png' $false
Write-LogoIcon 32 'favicon-32.png' $false
Write-LogoIcon 48 'favicon-48.png' $false
Write-LogoIcon 96 'favicon-96.png' $false
Write-LogoIcon 180 'apple-touch-icon.png' $true
Write-LogoIcon 192 'icon-192.png' $true
Write-LogoIcon 512 'icon-512.png' $true
$source.Dispose()

$canvas=New-Object System.Drawing.Bitmap(1200,630)
$g=[System.Drawing.Graphics]::FromImage($canvas)
$g.SmoothingMode=[System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.TextRenderingHint=[System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$g.Clear([System.Drawing.ColorTranslator]::FromHtml('#2a0f16'))
$line=New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml('#6d2c3b'),2)
$g.DrawRectangle($line,35,35,1130,560)
$wordmark=[System.Drawing.Bitmap]::FromFile((Join-Path $assetRoot 'logo-original.png'))
$w=620;$h=[int]($w*$wordmark.Height/$wordmark.Width)
$g.DrawImage($wordmark,[int]((1200-$w)/2),[int]((630-$h)/2),$w,$h)
$canvas.Save((Join-Path $assetRoot 'social-preview.png'),[System.Drawing.Imaging.ImageFormat]::Png)
$wordmark.Dispose();$line.Dispose();$g.Dispose();$canvas.Dispose()
Write-Output 'Created favicons, home-screen icons and 1200 x 630 social preview.'
