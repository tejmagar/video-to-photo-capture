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
import org.json.JSONArray;
import org.json.JSONObject;

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
        DownloadManager downloadManager = new DownloadManager(activity);

        try {
            JSONObject args = invoke.getArgs();

            DownloadArgs downloadArgs = new DownloadArgs();
            downloadArgs.fileName = args.getString("fileName");

            JSONArray bytesArray = args.getJSONArray("bytes");
            byte[] bytes = new byte[bytesArray.length()];
            for (int i = 0; i < bytesArray.length(); i++) {
                bytes[i] = (byte) bytesArray.getInt(i);
            }

            downloadArgs.bytes = bytes;
            downloadManager.download(downloadArgs);

            invoke.resolve();
        } catch (Exception e) {
            invoke.reject("Failed to parse args", e);
        }
    }
}
