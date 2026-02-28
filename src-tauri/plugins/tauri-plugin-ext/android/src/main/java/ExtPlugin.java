package tauri.plugin.ext;

import android.app.Activity;
import android.content.Intent;
import android.util.Log;
import android.webkit.WebView;

import app.tauri.annotation.Command;
import app.tauri.annotation.TauriPlugin;
import app.tauri.plugin.Invoke;
import app.tauri.plugin.JSObject;
import app.tauri.plugin.Plugin;

import nativeandroid.ext.NativeAndroid;
import nativeandroid.ext.downloads.DownloadArgs;
import nativeandroid.ext.downloads.DownloadManager;

@TauriPlugin
public class ExtPlugin extends Plugin {
    private static final String TAG = "ExtPlugin";
    private Activity activity;

    private final NativeAndroid nativeAndroid;

    public ExtPlugin(Activity activity) {
        super(activity);
        this.activity = activity;
        this.nativeAndroid = new NativeAndroid(activity);
    }

    @Override
    public void load(WebView webView) {
        nativeAndroid.load(webView);
    }
    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
    }

    @Command
    public void getVersionCode(Invoke invoke) {
        Log.d(TAG, "getVersionCode");
        JSObject jsObject = new JSObject();
        jsObject.put("value", NativeAndroid.getVersionCode(activity));
        invoke.resolve(jsObject);
    }

    @Command
    public void saveToGallery(Invoke invoke) {
        DownloadArgs downloadArgs = invoke.parseArgs(DownloadArgs.class);
        DownloadManager downloadManager = new DownloadManager(activity);
        downloadManager.download(downloadArgs);
        invoke.resolve();
    }
}
