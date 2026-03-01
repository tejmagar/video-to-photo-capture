package tej.videotophoto.capture

import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import android.webkit.WebView
class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
    
    WebView.setWebContentsDebuggingEnabled(true)
  }
}