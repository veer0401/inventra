using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using Inventra.Desktop.Core.Domain.Sync;
using Xunit;

namespace Inventra.Desktop.Tests;

public class CanonicalJsonTests
{
    // Fixture rows are "<checksum>\t<payload>" where the checksum was produced by the backend's own
    // CanonicalJsonUtils.computeCanonicalChecksum (Jackson 2.21, Java 17) for that payload.
    public static IEnumerable<object[]> JavaFixtures()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "Fixtures", "canonical-json-java-checksums.tsv");
        foreach (var line in File.ReadAllLines(path, Encoding.UTF8))
        {
            if (string.IsNullOrWhiteSpace(line)) continue;
            var tab = line.IndexOf('\t');
            yield return new object[] { line[..tab], line[(tab + 1)..] };
        }
    }

    [Theory]
    [MemberData(nameof(JavaFixtures))]
    public void Checksum_MatchesBackendCanonicalChecksum(string expectedChecksum, string payload)
    {
        Assert.Equal(expectedChecksum, CanonicalJson.ComputeChecksum(payload));
    }

    [Fact]
    public void Checksum_IsIndependentOfKeyOrderAndWhitespace()
    {
        var a = CanonicalJson.ComputeChecksum("{\"b\": 1, \"a\": [1, 2]}");
        var b = CanonicalJson.ComputeChecksum("{\"a\":[1,2],\"b\":1}");
        Assert.Equal(a, b);
    }

    [Fact]
    public void Checksum_DiffersFromRawStringHash_WhenKeysAreUnsorted()
    {
        const string unsorted = "{\"supplierCode\":\"S1\",\"legalName\":\"Acme\"}";
        Assert.NotEqual(Inventra.Desktop.Data.DatabaseContext.ComputeSha256(unsorted), CanonicalJson.ComputeChecksum(unsorted));
    }

    [Theory]
    [InlineData(100.0, "100.0")]
    [InlineData(12.5, "12.5")]
    [InlineData(0.001, "0.001")]
    [InlineData(0.0001, "1.0E-4")]
    [InlineData(10000000.0, "1.0E7")]
    [InlineData(1234567.5, "1234567.5")]
    [InlineData(-3.25, "-3.25")]
    public void JavaDoubleToString_MatchesJavaFormat(double value, string expected)
    {
        Assert.Equal(expected, CanonicalJson.JavaDoubleToString(value));
    }
}
