package nativeandroid.ext.downloads;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.webkit.MimeTypeMap;
import android.widget.Toast;

import androidx.annotation.RequiresApi;

import java.io.OutputStream;

public class DownloadManager {

    private static final int REQUEST_CREATE_DOCUMENT = 1001;

    private final Activity activity;
    private DownloadArgs downloadArgs;

    public DownloadManager(Activity activity) {
        this.activity = activity;
    }

    public void download(DownloadArgs args) {
        this.downloadArgs = args;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            saveWithMediaStore();
        } else {
            openFilePicker();
        }
    }

    // ==============================
    // Android 10+ (API 29+)
    // ==============================
    @RequiresApi(api = Build.VERSION_CODES.Q)
    private void saveWithMediaStore() {
        try {
            ContentValues values = new ContentValues();
            values.put(MediaStore.Downloads.DISPLAY_NAME, downloadArgs.fileName);
            values.put(MediaStore.Downloads.MIME_TYPE, guessMime(downloadArgs.fileName));
            values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
            values.put(MediaStore.Downloads.IS_PENDING, 1);

            Uri uri = activity.getContentResolver().insert(
                    MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                    values
            );

            if (uri == null) throw new RuntimeException("Insert failed");

            write(activity.getContentResolver(), uri, downloadArgs.bytes);

            // Mark as finished
            values.clear();
            values.put(MediaStore.Downloads.IS_PENDING, 0);
            activity.getContentResolver().update(uri, values, null, null);

            Toast.makeText(activity, "Saved to Gallery", Toast.LENGTH_SHORT).show();

        } catch (Exception e) {
            e.printStackTrace();
            Toast.makeText(activity, "Save failed", Toast.LENGTH_SHORT).show();
        } finally {
            downloadArgs = null;
        }
    }

    // ==============================
    // Android 4.4–9 (API 19–28)
    // ==============================
    private void openFilePicker() {
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(guessMime(downloadArgs.fileName));
        intent.putExtra(Intent.EXTRA_TITLE, downloadArgs.fileName);
        intent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        intent.addFlags(Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);

        activity.startActivityForResult(intent, REQUEST_CREATE_DOCUMENT);
    }

    public void onFilePicked(int requestCode, int resultCode, Intent data) {
        if (requestCode != REQUEST_CREATE_DOCUMENT ||
                resultCode != Activity.RESULT_OK ||
                data == null ||
                downloadArgs == null) {
            return;
        }

        Uri uri = data.getData();
        if (uri == null) return;

        try {
            // Persist permission
            activity.getContentResolver().takePersistableUriPermission(
                    uri,
                    Intent.FLAG_GRANT_WRITE_URI_PERMISSION
            );

            write(activity.getContentResolver(), uri, downloadArgs.bytes);

            Toast.makeText(activity, "Saved successfully", Toast.LENGTH_SHORT).show();

        } catch (Exception e) {
            e.printStackTrace();
            Toast.makeText(activity, "Save failed", Toast.LENGTH_SHORT).show();
        } finally {
            downloadArgs = null;
        }
    }

    // ==============================
    // Shared Writer
    // ==============================
    private static void write(ContentResolver resolver, Uri uri, byte[] bytes) throws Exception {
        try (OutputStream os = resolver.openOutputStream(uri)) {
            if (os == null) throw new RuntimeException("Stream null");
            os.write(bytes);
            os.flush();
        }
    }

    private static String guessMime(String name) {
        String ext = MimeTypeMap.getFileExtensionFromUrl(name);
        if (ext == null || ext.isEmpty()) return "application/octet-stream";

        String mime = MimeTypeMap.getSingleton()
                .getMimeTypeFromExtension(ext.toLowerCase());

        return mime != null ? mime : "application/octet-stream";
    }
}
