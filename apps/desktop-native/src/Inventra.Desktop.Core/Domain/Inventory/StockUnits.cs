using System;

namespace Inventra.Desktop.Core.Domain.Inventory;

/// <summary>
/// Unit-of-measure rules shared by every stock write. Local stock (like the server's) is kept in BASE units
/// (capsules, tablets, ml...). The screens work in selling/purchase units (strips, boxes), so a quantity
/// typed on a screen is multiplied by the product's units-per-pack before it touches stock, and the same
/// factor is sent to the server as <c>conversionFactor</c>.
/// </summary>
public static class StockUnits
{
    /// <summary>
    /// The whole-number pack size the server accepts (<c>conversionFactor &gt;= 1</c>). A product whose pack
    /// size is missing, below 1 or fractional cannot be expressed as a whole conversion, so it is treated as
    /// 1:1 (stock moves in the unit entered) rather than guessed.
    /// </summary>
    public static int ConversionFactor(double unitsPerSellingUnit)
    {
        var rounded = Math.Round(unitsPerSellingUnit);
        return rounded >= 1 && Math.Abs(unitsPerSellingUnit - rounded) < 1e-9 ? (int)rounded : 1;
    }

    public static double ToBaseUnits(double quantityInSellingUnits, double unitsPerSellingUnit) =>
        quantityInSellingUnits * ConversionFactor(unitsPerSellingUnit);
}
