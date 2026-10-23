using System;

namespace Inventra.Desktop.Infrastructure.Hardware;

public interface IBarcodeScannerService
{
    string ScannerStatus { get; }
    event EventHandler<string>? BarcodeScanned;
    void SimulateScan(string barcode);
}

public sealed class BarcodeScannerService : IBarcodeScannerService
{
    public string ScannerStatus => "Connected (Keyboard Wedge / Virtual)";
    public event EventHandler<string>? BarcodeScanned;

    public void SimulateScan(string barcode)
    {
        if (string.IsNullOrWhiteSpace(barcode)) return;
        BarcodeScanned?.Invoke(this, barcode.Trim());
    }
}
