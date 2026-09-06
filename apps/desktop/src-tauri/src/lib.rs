#[tauri::command]
fn get_terminal_device_info() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "platform": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "version": env!("CARGO_PKG_VERSION"),
        "hostname": std::env::var("COMPUTERNAME").or_else(|_| std::env::var("HOSTNAME")).unwrap_or_else(|_| "Inventra-Terminal".to_string())
    }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![get_terminal_device_info])
        .setup(|_app| {
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Inventra desktop application");
}
