package life.thatc.tv

import android.annotation.SuppressLint
import android.graphics.Color
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

/**
 * ThatC Life for Fire TV (Fire OS).
 * Hosts the 10-foot UI full-screen. The D-pad / Select keys reach the page as normal key events;
 * Back and Menu are bridged so the remote feels native.
 */
class MainActivity : AppCompatActivity() {
    private lateinit var web: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) // a countdown should never sleep
        web = WebView(this).apply {
            setBackgroundColor(Color.BLACK)
            isFocusable = true
            isFocusableInTouchMode = true
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                cacheMode = WebSettings.LOAD_DEFAULT
                mediaPlaybackRequiresUserGesture = false
            }
            webViewClient = object : WebViewClient() {
                override fun onReceivedError(v: WebView, r: WebResourceRequest, e: WebResourceError) {
                    if (r.isForMainFrame) showOffline(v)
                }
            }
        }
        setContentView(web)
        hideSystemUi()
        web.loadUrl(BuildConfig.THATC_URL)
        web.requestFocus()
    }

    private fun showOffline(v: WebView) {
        val html = """
            <body style="margin:0;background:#06060b;color:#f4f4fa;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center">
            <div><h1 style="font-size:56px">Can't reach ThatC Life</h1>
            <p style="font-size:30px;color:#a6a8bd">Make sure the server is running and this TV is on the same Wi-Fi.<br>${BuildConfig.THATC_URL}</p>
            <p style="font-size:28px;color:#7c5cff">Press Select to retry</p></div></body>
        """.trimIndent()
        v.loadDataWithBaseURL(null, html, "text/html", "utf-8", null)
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
        when (keyCode) {
            KeyEvent.KEYCODE_BACK -> {
                // Let the page close its overlay first; only leave the app if nothing was open.
                web.evaluateJavascript("(window.__tvBack&&window.__tvBack())||false") { handled ->
                    if (handled != "true") finish()
                }
                return true
            }
            KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER -> {
                if (web.url?.startsWith("data:") == true || web.url == null) { web.loadUrl(BuildConfig.THATC_URL); return true }
            }
            KeyEvent.KEYCODE_MENU -> { // opens the demo-clock panel
                web.evaluateJavascript(
                    "document.dispatchEvent(new KeyboardEvent('keydown',{key:'ContextMenu',keyCode:82,bubbles:true}))", null)
                return true
            }
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onResume() { super.onResume(); web.onResume(); hideSystemUi() }
    override fun onPause() { web.onPause(); super.onPause() }

    @Suppress("DEPRECATION")
    private fun hideSystemUi() {
        window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_FULLSCREEN or
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
    }
}
