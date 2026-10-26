using Avalonia.Controls;
using Avalonia.Markup.Xaml;

namespace Inventra.Desktop.App.Views.Workspaces;

public partial class SyncCenterView : UserControl
{
    public SyncCenterView()
    {
        InitializeComponent();
    }

    private void InitializeComponent()
    {
        AvaloniaXamlLoader.Load(this);
    }
}
