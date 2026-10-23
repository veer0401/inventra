using Avalonia.Controls;
using Inventra.Desktop.App.ViewModels;

namespace Inventra.Desktop.App.Views.Workspaces;

public partial class InventoryWorkspaceView : UserControl
{
    public InventoryWorkspaceViewModel? ViewModel => DataContext as InventoryWorkspaceViewModel;

    public InventoryWorkspaceView()
    {
        InitializeComponent();
    }
}
