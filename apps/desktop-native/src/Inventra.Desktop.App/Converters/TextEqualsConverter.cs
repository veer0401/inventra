using System;
using System.Globalization;
using Avalonia.Data;
using Avalonia.Data.Converters;

namespace Inventra.Desktop.App.Converters;

/// <summary>
/// True when the bound value and the converter parameter are equal as text. Used for tab panels
/// (<c>SelectedTabIndex</c> is an int, a XAML <c>ConverterParameter=0</c> is the string "0"), empty-state
/// messages (<c>Items.Count</c> against 0) and radio buttons. <see cref="ObjectConverters.Equal"/> compares the
/// two objects directly, so an int never equalled the string and every tab panel stayed hidden.
/// </summary>
public sealed class TextEqualsConverter : IValueConverter
{
    public static readonly TextEqualsConverter Instance = new();

    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture) =>
        string.Equals(
            System.Convert.ToString(value, CultureInfo.InvariantCulture),
            System.Convert.ToString(parameter, CultureInfo.InvariantCulture),
            StringComparison.Ordinal);

    // Radio buttons write the parameter back to the bound property when they are checked.
    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is not true || parameter == null) return BindingOperations.DoNothing;

        var type = Nullable.GetUnderlyingType(targetType) ?? targetType;
        try
        {
            return type.IsEnum
                ? Enum.Parse(type, parameter.ToString()!)
                : System.Convert.ChangeType(parameter, type, CultureInfo.InvariantCulture);
        }
        catch (Exception ex) when (ex is FormatException or InvalidCastException or ArgumentException or OverflowException)
        {
            return BindingOperations.DoNothing;
        }
    }
}
