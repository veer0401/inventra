using System;
using System.Threading.Tasks;
using Inventra.Desktop.Core.Domain.Identity;
using Inventra.Desktop.Data;
using Microsoft.Data.Sqlite;

namespace Inventra.Desktop.Infrastructure.Device;

public interface IDeviceIdentityService
{
    Task<DeviceRegistration> GetOrCreateDeviceAsync();
    Task UpdateDeviceStatusAsync(string status);
    Task RegisterPairingAsync(string deviceId, string deviceName, string deviceCode, string businessId, string storeId);
}

public sealed class DeviceIdentityService : IDeviceIdentityService
{
    private readonly DatabaseContext _dbContext;
    private DeviceRegistration? _cachedRegistration;

    public DeviceIdentityService(DatabaseContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<DeviceRegistration> GetOrCreateDeviceAsync()
    {
        if (_cachedRegistration != null) return _cachedRegistration;

        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var selectCmd = connection.CreateCommand();
        selectCmd.CommandText = @"
            SELECT device_id, device_name, device_code, business_id, store_id, status, registered_at
            FROM device_identity LIMIT 1;
        ";

        await using var reader = await selectCmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            _cachedRegistration = new DeviceRegistration
            {
                DeviceId = reader.GetString(0),
                DeviceName = reader.GetString(1),
                DeviceCode = reader.GetString(2),
                Status = reader.GetString(5),
                RegisteredAt = reader.GetInt64(6)
            };
            return _cachedRegistration;
        }

        // Generate persistent local device identity
        var newDeviceId = Guid.NewGuid().ToString();
        var machineName = Environment.MachineName;
        var deviceCode = $"POS-{machineName[..Math.Min(8, machineName.Length)].ToUpperInvariant()}-{new Random().Next(100, 999)}";
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        await using var insertCmd = connection.CreateCommand();
        insertCmd.CommandText = @"
            INSERT INTO device_identity (device_id, device_name, device_code, status, registered_at)
            VALUES (@id, @name, @code, 'ACTIVE', @now);
        ";
        insertCmd.Parameters.AddWithValue("@id", newDeviceId);
        insertCmd.Parameters.AddWithValue("@name", $"Terminal ({machineName})");
        insertCmd.Parameters.AddWithValue("@code", deviceCode);
        insertCmd.Parameters.AddWithValue("@now", now);

        await insertCmd.ExecuteNonQueryAsync();

        _cachedRegistration = new DeviceRegistration
        {
            DeviceId = newDeviceId,
            DeviceName = $"Terminal ({machineName})",
            DeviceCode = deviceCode,
            Status = "ACTIVE",
            RegisteredAt = now
        };

        return _cachedRegistration;
    }

    public async Task UpdateDeviceStatusAsync(string status)
    {
        var device = await GetOrCreateDeviceAsync();
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = "UPDATE device_identity SET status = @status WHERE device_id = @id;";
        cmd.Parameters.AddWithValue("@status", status);
        cmd.Parameters.AddWithValue("@id", device.DeviceId);
        await cmd.ExecuteNonQueryAsync();

        device.Status = status;
    }

    public async Task RegisterPairingAsync(string deviceId, string deviceName, string deviceCode, string businessId, string storeId)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            INSERT OR REPLACE INTO device_identity (device_id, device_name, device_code, business_id, store_id, status, registered_at)
            VALUES (@id, @name, @code, @biz, @store, 'ACTIVE', @now);
        ";
        cmd.Parameters.AddWithValue("@id", deviceId);
        cmd.Parameters.AddWithValue("@name", deviceName);
        cmd.Parameters.AddWithValue("@code", deviceCode);
        cmd.Parameters.AddWithValue("@biz", businessId);
        cmd.Parameters.AddWithValue("@store", storeId);
        cmd.Parameters.AddWithValue("@now", DateTimeOffset.UtcNow.ToUnixTimeMilliseconds());

        await cmd.ExecuteNonQueryAsync();

        _cachedRegistration = new DeviceRegistration
        {
            DeviceId = deviceId,
            DeviceName = deviceName,
            DeviceCode = deviceCode,
            Status = "ACTIVE"
        };
    }
}
