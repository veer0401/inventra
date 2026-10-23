using Avalonia.Controls;
using Avalonia.Markup.Xaml;

namespace Inventra.Desktop.App.Views.Workspaces;

public partial class DiagnosticsView : UserControl
{
    public DiagnosticsView()
    {
        InitializeComponent();
    }

    private void InitializeComponent()
    {
        AvaloniaXamlLoader.Load(this);
    }
}
