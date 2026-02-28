use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};

pub use models::*;

#[cfg(desktop)]
mod desktop;
#[cfg(mobile)]
mod mobile;

mod error;
mod models;

pub use error::{Error, Result};

#[cfg(desktop)]
use desktop::Ext;
#[cfg(mobile)]
use mobile::Ext;

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the ext APIs.

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("ext")
        .setup(|app, api| {
            #[cfg(mobile)]
            let ext = mobile::init(app, api)?;
            #[cfg(desktop)]
            let ext = desktop::init(app, api)?;
            app.manage(ext);
            Ok(())
        })
        .build()
}
