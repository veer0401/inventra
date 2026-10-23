using System;
using Inventra.Desktop.Core.Domain.Identity;
using Inventra.Desktop.Infrastructure.Logging;

namespace Inventra.Desktop.Infrastructure.Identity;

public sealed class AuthorizationService : IAuthorizationService
{
    private readonly Func<UserSession?> _sessionProvider;
    private readonly IAppLogger _logger;

    public AuthorizationService(Func<UserSession?> sessionProvider, IAppLogger? logger = null)
    {
        _sessionProvider = sessionProvider;
        _logger = logger ?? AppLogger.Instance;
    }

    public bool HasPermission(string permission)
    {
        var session = _sessionProvider();
        if (session == null || !session.IsAuthenticated)
        {
            return false;
        }

        return session.HasPermission(permission);
    }

    public void RequirePermission(string permission)
    {
        if (!HasPermission(permission))
        {
            var session = _sessionProvider();
            var role = session?.Role ?? "ANONYMOUS";
            var user = session?.Email ?? "Unknown";

            _logger.Log(AppLogLevel.WARN, LogCategory.AUTH,
                $"SECURITY VIOLATION: User '{user}' with role '{role}' attempted operation requiring '{permission}' without authorization.");

            throw new UnauthorizedAccessException(
                $"Operation forbidden: User does not possess required permission '{permission}'.");
        }
    }

    public bool CanCreateSale() => HasPermission(AppPermissions.SaleCreate);

    public bool CanAdjustInventory() => HasPermission(AppPermissions.InventoryAdjust);

    public bool CanCreateProduct() => HasPermission(AppPermissions.ProductCreate);

    public bool CanEditProduct() => HasPermission(AppPermissions.ProductEdit);

    public bool CanCreatePurchase() => HasPermission(AppPermissions.PurchaseCreate);

    public bool CanViewReports() => HasPermission(AppPermissions.ReportView);

    public bool CanManageSettings() => HasPermission(AppPermissions.SettingsManage);
}
