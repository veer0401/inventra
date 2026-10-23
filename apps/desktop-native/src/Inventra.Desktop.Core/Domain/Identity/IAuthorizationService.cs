namespace Inventra.Desktop.Core.Domain.Identity;

public interface IAuthorizationService
{
    bool HasPermission(string permission);
    void RequirePermission(string permission);

    bool CanCreateSale();
    bool CanAdjustInventory();
    bool CanCreateProduct();
    bool CanEditProduct();
    bool CanCreatePurchase();
    bool CanViewReports();
    bool CanManageSettings();
}
