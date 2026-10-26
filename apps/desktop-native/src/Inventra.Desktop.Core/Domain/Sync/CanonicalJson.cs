using System;
using System.Collections.Generic;
using System.Globalization;
using System.Numerics;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Inventra.Desktop.Core.Domain.Sync;

/// <summary>
/// Produces the canonical JSON form and SHA-256 checksum the backend verifies for every sync operation
/// (see CanonicalJsonUtils.java): object keys sorted by UTF-16 ordinal order, compact output, Jackson
/// string escaping, integers as plain digits and fractional numbers in Java <c>Double.toString</c> form.
/// </summary>
public static class CanonicalJson
{
    public static string ComputeChecksum(string json)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(Canonicalize(json)));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    public static string Canonicalize(string json)
    {
        using var doc = JsonDocument.Parse(json);
        var sb = new StringBuilder();
        Write(sb, doc.RootElement);
        return sb.ToString();
    }

    private static void Write(StringBuilder sb, JsonElement el)
    {
        switch (el.ValueKind)
        {
            case JsonValueKind.Object:
                var props = new List<JsonProperty>();
                foreach (var p in el.EnumerateObject()) props.Add(p);
                props.Sort((a, b) => string.CompareOrdinal(a.Name, b.Name));
                sb.Append('{');
                for (var i = 0; i < props.Count; i++)
                {
                    if (i > 0) sb.Append(',');
                    WriteString(sb, props[i].Name);
                    sb.Append(':');
                    Write(sb, props[i].Value);
                }
                sb.Append('}');
                break;
            case JsonValueKind.Array:
                sb.Append('[');
                var first = true;
                foreach (var child in el.EnumerateArray())
                {
                    if (!first) sb.Append(',');
                    first = false;
                    Write(sb, child);
                }
                sb.Append(']');
                break;
            case JsonValueKind.String:
                WriteString(sb, el.GetString()!);
                break;
            case JsonValueKind.Number:
                sb.Append(FormatNumber(el.GetRawText()));
                break;
            case JsonValueKind.True:
                sb.Append("true");
                break;
            case JsonValueKind.False:
                sb.Append("false");
                break;
            default:
                sb.Append("null");
                break;
        }
    }

    private static void WriteString(StringBuilder sb, string s)
    {
        sb.Append('"');
        foreach (var c in s)
        {
            switch (c)
            {
                case '"': sb.Append("\\\""); break;
                case '\\': sb.Append("\\\\"); break;
                case '\b': sb.Append("\\b"); break;
                case '\t': sb.Append("\\t"); break;
                case '\n': sb.Append("\\n"); break;
                case '\f': sb.Append("\\f"); break;
                case '\r': sb.Append("\\r"); break;
                default:
                    if (c < 0x20) sb.Append("\\u").Append(((int)c).ToString("X4", CultureInfo.InvariantCulture));
                    else sb.Append(c);
                    break;
            }
        }
        sb.Append('"');
    }

    // Jackson reads a literal without '.', 'e' or 'E' as an integer node and everything else as a double.
    private static string FormatNumber(string raw)
    {
        if (raw.IndexOfAny(new[] { '.', 'e', 'E' }) < 0)
        {
            return BigInteger.Parse(raw, CultureInfo.InvariantCulture).ToString(CultureInfo.InvariantCulture);
        }
        return JavaDoubleToString(double.Parse(raw, NumberStyles.Float, CultureInfo.InvariantCulture));
    }

    public static string JavaDoubleToString(double value)
    {
        if (value == 0) return double.IsNegative(value) ? "-0.0" : "0.0";

        var negative = value < 0;
        var abs = Math.Abs(value);

        // Shortest round-trip digits, e.g. "12.5", "1E-05", "1.2345E+20".
        var r = abs.ToString("R", CultureInfo.InvariantCulture);
        var exp = 0;
        var eIdx = r.IndexOfAny(new[] { 'E', 'e' });
        if (eIdx >= 0)
        {
            exp = int.Parse(r[(eIdx + 1)..], NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture);
            r = r[..eIdx];
        }

        var dot = r.IndexOf('.');
        var digits = dot < 0 ? r : r.Remove(dot, 1);
        var pointPos = (dot < 0 ? r.Length : dot) + exp;

        var leading = 0;
        while (leading < digits.Length - 1 && digits[leading] == '0') leading++;
        digits = digits[leading..];
        pointPos -= leading;
        digits = digits.TrimEnd('0');
        if (digits.Length == 0) digits = "0";

        var sciExp = pointPos - 1;
        var sb = new StringBuilder();
        if (negative) sb.Append('-');

        if (abs >= 1e-3 && abs < 1e7)
        {
            if (pointPos <= 0)
            {
                sb.Append("0.").Append('0', -pointPos).Append(digits);
            }
            else if (digits.Length <= pointPos)
            {
                sb.Append(digits).Append('0', pointPos - digits.Length).Append(".0");
            }
            else
            {
                sb.Append(digits, 0, pointPos).Append('.').Append(digits, pointPos, digits.Length - pointPos);
            }
        }
        else
        {
            sb.Append(digits[0]).Append('.');
            sb.Append(digits.Length > 1 ? digits[1..] : "0");
            sb.Append('E').Append(sciExp.ToString(CultureInfo.InvariantCulture));
        }
        return sb.ToString();
    }
}
