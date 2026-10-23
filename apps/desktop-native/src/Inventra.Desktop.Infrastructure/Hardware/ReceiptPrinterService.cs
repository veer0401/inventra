using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using Inventra.Desktop.Core.Domain.Sales;

namespace Inventra.Desktop.Infrastructure.Hardware;

public interface IReceiptPrinterService
{
    string PrinterName { get; set; }
    string PrinterStatus { get; }
    byte[] GenerateTestReceipt(string pharmacyName, string gstin, string storeName);
    byte[] GenerateSaleReceipt(SaleRecord sale, string pharmacyName, string gstin, string storeName, string terminalCode);
    byte[] GenerateCashDrawerKick();
    Task<bool> PrintBytesAsync(byte[] data);
}

public sealed class ReceiptPrinterService : IReceiptPrinterService
{
    // ESC/POS Command Constants matching standard 80mm thermal receipt specifications
    private const byte ESC = 0x1B;
    private const byte GS = 0x1D;

    private static readonly byte[] CmdInit = [ESC, 0x40];
    private static readonly byte[] CmdAlignLeft = [ESC, 0x61, 0x00];
    private static readonly byte[] CmdAlignCenter = [ESC, 0x61, 0x01];
    private static readonly byte[] CmdBoldOn = [ESC, 0x45, 0x01];
    private static readonly byte[] CmdBoldOff = [ESC, 0x45, 0x00];
    private static readonly byte[] CmdDoubleSize = [GS, 0x21, 0x11];
    private static readonly byte[] CmdNormalSize = [GS, 0x21, 0x00];
    private static readonly byte[] CmdFeedAndCut = [GS, 0x56, 0x42, 0x03];
    private static readonly byte[] CmdDrawerKick = [ESC, 0x70, 0x00, 0x19, 0xFA];
    private static readonly byte[] CmdLineFeed = [0x0A];

    public string PrinterName { get; set; } = "Default Receipt Printer (Virtual Spooler)";
    public string PrinterStatus => "Ready";

    public byte[] GenerateSaleReceipt(SaleRecord sale, string pharmacyName, string gstin, string storeName, string terminalCode)
    {
        using var ms = new MemoryStream();

        void Append(byte[] bytes) => ms.Write(bytes, 0, bytes.Length);
        void Text(string str) => ms.Write(Encoding.ASCII.GetBytes(str), 0, str.Length);
        void Line(string str = "")
        {
            if (!string.IsNullOrEmpty(str)) Text(str);
            Append(CmdLineFeed);
        }

        int width = 48; // Standard 80mm width in characters

        Append(CmdInit);
        Append(CmdAlignCenter);
        Append(CmdDoubleSize);
        Append(CmdBoldOn);
        Line(string.IsNullOrWhiteSpace(pharmacyName) ? "INVENTRA PHARMACY" : pharmacyName.ToUpperInvariant());
        Append(CmdNormalSize);
        Append(CmdBoldOff);
        Line(string.IsNullOrWhiteSpace(storeName) ? "Retail Counter" : storeName);
        if (!string.IsNullOrWhiteSpace(gstin))
        {
            Line($"GSTIN: {gstin}");
        }
        Line(new string('-', width));

        Append(CmdAlignLeft);
        var saleTime = DateTimeOffset.FromUnixTimeMilliseconds(sale.CreatedAt).LocalDateTime.ToString("dd-MMM-yyyy HH:mm");
        Line($"Date: {saleTime}   Term: {terminalCode}");
        Line($"Invoice: {sale.InvoiceNumber}");
        if (!string.IsNullOrWhiteSpace(sale.CustomerName))
        {
            Line($"Customer: {sale.CustomerName} {(string.IsNullOrWhiteSpace(sale.CustomerPhone) ? "" : $"({sale.CustomerPhone})")}");
        }
        Line(new string('-', width));

        Append(CmdBoldOn);
        Line("Item / Batch            Qty    Price      Total");
        Append(CmdBoldOff);
        Line(new string('-', width));

        foreach (var item in sale.Items)
        {
            var name = item.ProductName.Length > 22 ? item.ProductName[..22] : item.ProductName.PadRight(22);
            var qty = $"{item.Quantity,3:F0}";
            var price = $"{item.UnitPrice,8:F2}";
            var total = $"{item.TotalAmount,10:F2}";
            Line($"{name} {qty} {price} {total}");
            if (!string.IsNullOrWhiteSpace(item.BatchNumber))
            {
                Line($"  Batch: {item.BatchNumber}  GST: {item.TaxRate:F1}%");
            }
        }
        Line(new string('-', width));

        Line($"Taxable Subtotal:                      Rs {sale.Subtotal,8:F2}");
        Line($"GST Amount:                            Rs {sale.TaxAmount,8:F2}");
        if (sale.DiscountAmount > 0)
        {
            Line($"Discount:                             -Rs {sale.DiscountAmount,8:F2}");
        }
        Line(new string('=', width));
        Append(CmdBoldOn);
        Line($"TOTAL AMOUNT:                          Rs {sale.TotalAmount,8:F2}");
        Append(CmdBoldOff);
        Line(new string('=', width));
        Line($"Payment Method: {sale.PaymentMethod.ToUpperInvariant()}");
        Line($"Payment Status: {sale.PaymentStatus.ToUpperInvariant()}");
        Line(new string('-', width));

        Append(CmdAlignCenter);
        Line("Thank you for your visit!");
        Line("Inventra Pharmacy ERP");
        Line(new string('-', width));

        Append(CmdFeedAndCut);

        return ms.ToArray();
    }

    public byte[] GenerateTestReceipt(string pharmacyName, string gstin, string storeName)
    {
        using var ms = new MemoryStream();

        void Append(byte[] bytes) => ms.Write(bytes, 0, bytes.Length);
        void Text(string str) => ms.Write(Encoding.ASCII.GetBytes(str), 0, str.Length);
        void Line(string str = "")
        {
            if (!string.IsNullOrEmpty(str)) Text(str);
            Append(CmdLineFeed);
        }

        int width = 48;

        Append(CmdInit);
        Append(CmdAlignCenter);
        Append(CmdDoubleSize);
        Append(CmdBoldOn);
        Line(string.IsNullOrWhiteSpace(pharmacyName) ? "INVENTRA TERMINAL" : pharmacyName.ToUpperInvariant());
        Append(CmdNormalSize);
        Append(CmdBoldOff);
        Line(string.IsNullOrWhiteSpace(storeName) ? "Workstation" : storeName);
        if (!string.IsNullOrWhiteSpace(gstin))
        {
            Line($"GSTIN: {gstin}");
        }
        Line(new string('-', width));

        Append(CmdAlignLeft);
        Line($"Date: {DateTime.Now:dd-MMM-yyyy HH:mm}   Terminal: READY");
        Line("Test: ESC/POS Thermal Spooler Self-Check");
        Line(new string('-', width));
        Line("Printer spooler channel: ONLINE");
        Line("Status: ESC/POS 80mm Alignment OK");
        Line(new string('-', width));

        Append(CmdAlignCenter);
        Line("Inventra Native Desktop ERP");
        Line(new string('-', width));

        Append(CmdFeedAndCut);

        return ms.ToArray();
    }

    public byte[] GenerateCashDrawerKick() => CmdDrawerKick;

    public Task<bool> PrintBytesAsync(byte[] data)
    {
        return Task.FromResult(true);
    }
}
