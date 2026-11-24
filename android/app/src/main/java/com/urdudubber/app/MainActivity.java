package com.urdudubber.app;

import android.content.Intent;
import android.database.Cursor;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.provider.Settings;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    private static final int MAX_SUBTITLE_BYTES = 15 * 1024 * 1024; // 15 MB safety cap
    private volatile String pendingSubtitlePayloadJson = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applyObsidianSystemBars();
        registerHostBridge();
        captureIncomingSubtitleIntent(getIntent(), false);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        captureIncomingSubtitleIntent(intent, true);
    }

    private void applyObsidianSystemBars() {
        try {
            Window window = getWindow();
            if (window != null) {
                int obsidian = Color.parseColor("#090a0d");
                window.setStatusBarColor(obsidian);
                window.setNavigationBarColor(obsidian);
            }
        } catch (Exception ignored) {
        }
    }

    private void registerHostBridge() {
        try {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                WebView webView = this.bridge.getWebView();
                webView.addJavascriptInterface(new AndroidHostBridge(), "AndroidHostBridge");
            }
        } catch (Exception ignored) {
        }
    }

    private void captureIncomingSubtitleIntent(Intent intent, boolean notifyWeb) {
        if (intent == null) return;
        String action = intent.getAction();
        Uri uri = null;
        String sharedText = null;

        if (Intent.ACTION_VIEW.equals(action)) {
            uri = intent.getData();
        } else if (Intent.ACTION_SEND.equals(action)) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                uri = intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri.class);
            } else {
                @SuppressWarnings("deprecation")
                Uri legacyUri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
                uri = legacyUri;
            }
            if (uri == null) {
                sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
            }
        }

        try {
            if (uri != null) {
                String name = resolveDisplayName(uri);
                String content = readTextFromUri(uri);
                if (content != null && !content.trim().isEmpty()) {
                    JSONObject obj = new JSONObject();
                    obj.put("name", name != null && !name.isEmpty() ? name : "imported_subtitle.srt");
                    obj.put("content", content);
                    pendingSubtitlePayloadJson = obj.toString();
                }
            } else if (sharedText != null && !sharedText.trim().isEmpty()) {
                JSONObject obj = new JSONObject();
                obj.put("name", "shared_subtitle.srt");
                obj.put("content", sharedText);
                pendingSubtitlePayloadJson = obj.toString();
            }
        } catch (Exception ignored) {
        }

        if (notifyWeb && pendingSubtitlePayloadJson != null) {
            dispatchOpenFileEvent();
        }
    }

    private void dispatchOpenFileEvent() {
        runOnUiThread(() -> {
            try {
                if (this.bridge != null && this.bridge.getWebView() != null) {
                    this.bridge.getWebView().evaluateJavascript(
                        "window.dispatchEvent(new Event('urduLocalizerOpenFile'));",
                        null
                    );
                }
            } catch (Exception ignored) {
            }
        });
    }

    private String resolveDisplayName(Uri uri) {
        if (uri == null) return "subtitle.srt";
        if ("content".equalsIgnoreCase(uri.getScheme())) {
            try (Cursor cursor = getContentResolver().query(uri, null, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    int idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                    if (idx >= 0) {
                        String val = cursor.getString(idx);
                        if (val != null && !val.trim().isEmpty()) {
                            return val.trim();
                        }
                    }
                }
            } catch (Exception ignored) {
            }
        }
        String lastSegment = uri.getLastPathSegment();
        return lastSegment != null && !lastSegment.trim().isEmpty() ? lastSegment : "subtitle.srt";
    }

    private String readTextFromUri(Uri uri) {
        try (InputStream is = getContentResolver().openInputStream(uri)) {
            if (is == null) return null;
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            byte[] chunk = new byte[8192];
            int total = 0;
            int read;
            while ((read = is.read(chunk)) != -1) {
                total += read;
                if (total > MAX_SUBTITLE_BYTES) {
                    break;
                }
                buffer.write(chunk, 0, read);
            }
            return buffer.toString(StandardCharsets.UTF_8.name());
        } catch (Exception ignored) {
            return null;
        }
    }

    public class AndroidHostBridge {
        @JavascriptInterface
        public String consumePendingSubtitleIntent() {
            String payload = pendingSubtitlePayloadJson;
            pendingSubtitlePayloadJson = null;
            return payload != null ? payload : "";
        }

        @JavascriptInterface
        public void openAppSettings() {
            runOnUiThread(() -> {
                try {
                    Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                    intent.setData(Uri.fromParts("package", getPackageName(), null));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                } catch (Exception ignored) {
                }
            });
        }

        @JavascriptInterface
        public int getSdkInt() {
            return Build.VERSION.SDK_INT;
        }

        @JavascriptInterface
        public String getAppVersionName() {
            try {
                return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
            } catch (Exception e) {
                return "2.0.0";
            }
        }
    }
}
