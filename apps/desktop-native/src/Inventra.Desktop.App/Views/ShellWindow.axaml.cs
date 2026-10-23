using Avalonia.Controls;
using Inventra.Desktop.App.ViewModels;

namespace Inventra.Desktop.App.Views;

public partial class ShellWindow : Window
{
    public ShellWindow()
    {
        InitializeComponent();
    }

    public ShellWindow(ShellViewModel viewModel) : this()
    {
        DataContext = viewModel;
    }
}
