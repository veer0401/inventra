using Avalonia.Controls;
using Inventra.Desktop.App.ViewModels;

namespace Inventra.Desktop.App.Views.Workspaces;

public partial class PurchasesWorkspaceView : UserControl
{
    public PurchasesWorkspaceView()
    {
        InitializeComponent();
    }

    public PurchasesWorkspaceViewModel? ViewModel => DataContext as PurchasesWorkspaceViewModel;
}
