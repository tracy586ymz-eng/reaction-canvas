Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Drawing;
using System.Windows.Forms;
using System.Runtime.InteropServices;
public class ReactionSelection : Form {
 [DllImport("user32.dll")] static extern bool SetProcessDPIAware();
 Point start; Rectangle selected; bool dragging;
 public ReactionSelection() {
  SetProcessDPIAware(); FormBorderStyle = FormBorderStyle.None; StartPosition = FormStartPosition.Manual;
  Bounds = SystemInformation.VirtualScreen; BackColor = Color.Black; Opacity = 0.22; TopMost = true;
  Cursor = Cursors.Cross; KeyPreview = true; DoubleBuffered = true;
  KeyDown += (s,e) => { if(e.KeyCode == Keys.Escape) Close(); };
  MouseDown += (s,e) => { start=e.Location; dragging=true; };
  MouseMove += (s,e) => { if(dragging) { selected = new Rectangle(Math.Min(start.X,e.X), Math.Min(start.Y,e.Y),Math.Abs(e.X-start.X),Math.Abs(e.Y-start.Y)); Invalidate(); } };
  Paint += (s,e) => { if(dragging) { using(var pen=new Pen(Color.White,3)) e.Graphics.DrawRectangle(pen,selected); } };
  MouseUp += (s,e) => {
   if(!dragging || selected.Width < 4 || selected.Height < 4) { Close(); return; }
   var area = new Rectangle(Left+selected.Left,Top+selected.Top,selected.Width,selected.Height);
   Hide(); Application.DoEvents(); System.Threading.Thread.Sleep(150);
   using(var bmp = new Bitmap(area.Width, area.Height)) {
    using(var g=Graphics.FromImage(bmp)) g.CopyFromScreen(area.Location,Point.Empty,area.Size);
    bmp.Save(Environment.GetEnvironmentVariable("REACTION_CAPTURE_PATH"), System.Drawing.Imaging.ImageFormat.Png);
   } Close();
  };
 }
}
'@
[System.Windows.Forms.Application]::EnableVisualStyles()
[System.Windows.Forms.Application]::Run((New-Object ReactionSelection))
