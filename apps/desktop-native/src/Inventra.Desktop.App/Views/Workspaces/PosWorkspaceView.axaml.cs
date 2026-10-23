using Avalonia.Controls;
using Inventra.Desktop.App.ViewModels;

namespace Inventra.Desktop.App.Views.Workspaces;

public partial class PosWorkspaceView : UserControl
{
    public PosWorkspaceViewModel? ViewModel => DataContext as PosWorkspaceViewModel;

    public PosWorkspaceView()
    {
        InitializeComponent();
    }
}
