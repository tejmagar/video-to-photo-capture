use serde::de::DeserializeOwned;
use tauri::{
  plugin::{PluginApi, PluginHandle},
  AppHandle, Runtime,
};

use crate::models::*;

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_ext);

// initializes the Kotlin or Swift plugin classes
pub fn init<R: Runtime, C: DeserializeOwned>(
  _app: &AppHandle<R>,
  api: PluginApi<R, C>,
) -> crate::Result<Ext<R>> {
  #[cfg(target_os = "android")]
  let handle = api.register_android_plugin("tauri.plugin.ext", "ExtPlugin")?;
  #[cfg(target_os = "ios")]
  let handle = api.register_ios_plugin(init_plugin_ext)?;
  Ok(Ext(handle))
}

pub struct Ext<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> Ext<R> {}
