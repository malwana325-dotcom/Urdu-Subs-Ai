package com.urdudubber.app;

import android.Manifest;
import android.app.Activity;
import android.content.ContentResolver;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.UriPermission;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.DocumentsContract;
import android.provider.OpenableColumns;
import android.provider.Settings;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    private static final int MAX_SUBTITLE_BYTES = 15 * 1024 * 1024; // 15 MB safety cap
    private static final int REQ_STORAGE_PERMISSIONS = 4102;
    private static final String PREFS_NAME = "urdu_localizer_native";
    private static final String PREF_EXPORT_TREE_URI = "export_tree_uri";
    private static final String PREF_EXPORT_TREE_NAME = "export_tree_name";

    private volatile String pendingSubtitlePayloadJson = null;
    private ActivityResultLauncher<Intent> folderPickerLauncher;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerFolderPickerLauncher();
        registerBackNavigationCallback();
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

    private void registerFolderPickerLauncher() {
        folderPickerLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            result -> {
                if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
                    Uri treeUri = result.getData().getData();
                    if (treeUri != null) {
                        int flags = Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION;
                        try {
                            getContentResolver().takePersistableUriPermission(treeUri, flags);
                        } catch (Exception ignored) {
                        }
                        String folderName = resolveTreeDisplayName(treeUri);
                        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
                        prefs.edit()
                            .putString(PREF_EXPORT_TREE_URI, treeUri.toString())
                            .putString(PREF_EXPORT_TREE_NAME, folderName)
                            .apply();
                        dispatchWebEvent("urduLocalizerFolderPicked");
                        return;
                    }
                }
                dispatchWebEvent("urduLocalizerFolderCanceled");
            }
        );
    }

    private void registerBackNavigationCallback() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = (bridge != null) ? bridge.getWebView() : null;
                if (webView != null) {
                    webView.evaluateJavascript(
                        "(function(){ try { return typeof window.__urduLocalizerHandleBack === 'function' ? Boolean(window.__urduLocalizerHandleBack()) : false; } catch(e) { return false; } })()",
                        value -> {
                            if (!"true".equals(value)) {
                                runOnUiThread(() -> moveTaskToBack(true));
                            }
                        }
                    );
                } else {
                    moveTaskToBack(true);
                }
            }
        });
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_STORAGE_PERMISSIONS) {
            dispatchWebEvent("urduLocalizerPermissionsChanged");
        }
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

    private void dispatchWebEvent(String eventName) {
        runOnUiThread(() -> {
            try {
                if (this.bridge != null && this.bridge.getWebView() != null) {
                    this.bridge.getWebView().evaluateJavascript(
                        "window.dispatchEvent(new Event('" + eventName + "'));",
                        null
                    );
                }
            } catch (Exception ignored) {
            }
        });
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
            dispatchWebEvent("urduLocalizerOpenFile");
        }
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

    private String resolveTreeDisplayName(Uri treeUri) {
        try {
            String docId = DocumentsContract.getTreeDocumentId(treeUri);
            if (docId != null && !docId.trim().isEmpty()) {
                int colon = docId.indexOf(':');
                String volume = colon >= 0 ? docId.substring(0, colon) : "";
                String relPath = colon >= 0 ? docId.substring(colon + 1) : docId;
                relPath = relPath.replaceAll("^/+|/+$", "");
                if (!relPath.isEmpty()) {
                    if ("primary".equalsIgnoreCase(volume) || volume.isEmpty()) {
                        return relPath;
                    }
                    return volume + "/" + relPath;
                }
                if ("primary".equalsIgnoreCase(volume)) {
                    return "Internal Storage";
                }
                if (!volume.isEmpty()) {
                    return volume;
                }
            }
        } catch (Exception ignored) {
        }
        String seg = treeUri.getLastPathSegment();
        return (seg != null && !seg.trim().isEmpty()) ? seg : "Selected Folder";
    }

    private boolean hasPersistedWritePermission(Uri treeUri) {
        try {
            List<UriPermission> list = getContentResolver().getPersistedUriPermissions();
            for (UriPermission perm : list) {
                if (perm.getUri().equals(treeUri) && perm.isWritePermission()) {
                    return true;
                }
            }
        } catch (Exception ignored) {
        }
        return false;
    }

    private Uri findExistingChildDocument(ContentResolver cr, Uri treeUri, String treeDocId, String fileName) {
        Uri childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(treeUri, treeDocId);
        String[] projection = new String[] {
            DocumentsContract.Document.COLUMN_DOCUMENT_ID,
            DocumentsContract.Document.COLUMN_DISPLAY_NAME
        };
        try (Cursor cursor = cr.query(childrenUri, projection, null, null, null)) {
            if (cursor != null) {
                while (cursor.moveToNext()) {
                    String name = cursor.getString(1);
                    if (fileName.equals(name)) {
                        String docId = cursor.getString(0);
                        return DocumentsContract.buildDocumentUriUsingTree(treeUri, docId);
                    }
                }
            }
        } catch (Exception ignored) {
        }
        return null;
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

    private boolean hasLegacyStoragePermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return true;
        }
        boolean readOk = ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE)
            == PackageManager.PERMISSION_GRANTED;
        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.Q) {
            boolean writeOk = ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE)
                == PackageManager.PERMISSION_GRANTED;
            return readOk && writeOk;
        }
        return readOk;
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

        @JavascriptInterface
        public boolean hasStoragePermission() {
            if (hasLegacyStoragePermissions()) {
                return true;
            }
            return !getSelectedExportFolderJson().isEmpty();
        }

        @JavascriptInterface
        public boolean needsLegacyRuntimePermission() {
            return Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU && !hasLegacyStoragePermissions();
        }

        @JavascriptInterface
        public void requestStoragePermissionsNow() {
            runOnUiThread(() -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    dispatchWebEvent("urduLocalizerPermissionsChanged");
                    return;
                }
                List<String> needed = new ArrayList<>();
                if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.READ_EXTERNAL_STORAGE)
                    != PackageManager.PERMISSION_GRANTED) {
                    needed.add(Manifest.permission.READ_EXTERNAL_STORAGE);
                }
                if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.Q
                    && ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.WRITE_EXTERNAL_STORAGE)
                    != PackageManager.PERMISSION_GRANTED) {
                    needed.add(Manifest.permission.WRITE_EXTERNAL_STORAGE);
                }
                if (needed.isEmpty()) {
                    dispatchWebEvent("urduLocalizerPermissionsChanged");
                } else {
                    ActivityCompat.requestPermissions(
                        MainActivity.this,
                        needed.toArray(new String[0]),
                        REQ_STORAGE_PERMISSIONS
                    );
                }
            });
        }

        @JavascriptInterface
        public void pickExportFolder() {
            runOnUiThread(() -> {
                try {
                    Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
                    intent.addFlags(
                        Intent.FLAG_GRANT_READ_URI_PERMISSION
                            | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                            | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
                            | Intent.FLAG_GRANT_PREFIX_URI_PERMISSION
                    );
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
                        String existing = prefs.getString(PREF_EXPORT_TREE_URI, null);
                        if (existing != null && !existing.isEmpty()) {
                            intent.putExtra(DocumentsContract.EXTRA_INITIAL_URI, Uri.parse(existing));
                        }
                    }
                    folderPickerLauncher.launch(intent);
                } catch (Exception e) {
                    dispatchWebEvent("urduLocalizerFolderCanceled");
                }
            });
        }

        @JavascriptInterface
        public String getSelectedExportFolderJson() {
            try {
                SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
                String uriStr = prefs.getString(PREF_EXPORT_TREE_URI, null);
                String name = prefs.getString(PREF_EXPORT_TREE_NAME, "Selected Folder");
                if (uriStr == null || uriStr.isEmpty()) return "";
                Uri uri = Uri.parse(uriStr);
                if (!hasPersistedWritePermission(uri)) {
                    prefs.edit().remove(PREF_EXPORT_TREE_URI).remove(PREF_EXPORT_TREE_NAME).apply();
                    return "";
                }
                JSONObject obj = new JSONObject();
                obj.put("uri", uriStr);
                obj.put("name", name != null && !name.isEmpty() ? name : resolveTreeDisplayName(uri));
                return obj.toString();
            } catch (Exception e) {
                return "";
            }
        }

        @JavascriptInterface
        public void clearSelectedExportFolder() {
            try {
                SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
                prefs.edit().remove(PREF_EXPORT_TREE_URI).remove(PREF_EXPORT_TREE_NAME).apply();
                dispatchWebEvent("urduLocalizerFolderPicked");
            } catch (Exception ignored) {
            }
        }

        @JavascriptInterface
        public String writeFileToSelectedFolder(String fileName, String content, String mimeType) {
            JSONObject res = new JSONObject();
            try {
                SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
                String uriStr = prefs.getString(PREF_EXPORT_TREE_URI, null);
                String folderName = prefs.getString(PREF_EXPORT_TREE_NAME, "Selected Folder");
                if (uriStr == null || uriStr.isEmpty()) {
                    res.put("success", false);
                    res.put("error", "No export folder selected.");
                    return res.toString();
                }

                Uri treeUri = Uri.parse(uriStr);
                if (!hasPersistedWritePermission(treeUri)) {
                    res.put("success", false);
                    res.put("error", "Folder permission expired. Please select your export folder again.");
                    return res.toString();
                }

                ContentResolver cr = getContentResolver();
                String treeDocId = DocumentsContract.getTreeDocumentId(treeUri);
                Uri parentDocUri = DocumentsContract.buildDocumentUriUsingTree(treeUri, treeDocId);
                String safeMime = (mimeType != null && !mimeType.trim().isEmpty()) ? mimeType : "text/plain";

                Uri targetUri = findExistingChildDocument(cr, treeUri, treeDocId, fileName);
                if (targetUri != null) {
                    try {
                        DocumentsContract.deleteDocument(cr, targetUri);
                        targetUri = null;
                    } catch (Exception ignored) {
                    }
                }
                if (targetUri == null) {
                    targetUri = DocumentsContract.createDocument(cr, parentDocUri, safeMime, fileName);
                }
                if (targetUri == null) {
                    res.put("success", false);
                    res.put("error", "Android could not create file in the selected folder.");
                    return res.toString();
                }

                byte[] bytes = (content != null ? content : "").getBytes(StandardCharsets.UTF_8);
                try (OutputStream os = cr.openOutputStream(targetUri, "wt")) {
                    if (os == null) {
                        res.put("success", false);
                        res.put("error", "Unable to open output stream for selected folder.");
                        return res.toString();
                    }
                    os.write(bytes);
                    os.flush();
                }

                res.put("success", true);
                res.put("uri", targetUri.toString());
                res.put("folderName", folderName);
                res.put("fileName", fileName);
                return res.toString();
            } catch (Exception e) {
                try {
                    res.put("success", false);
                    res.put("error", e.getMessage() != null ? e.getMessage() : "Failed to write to selected folder.");
                } catch (Exception ignored) {
                }
                return res.toString();
            }
        }
    }
}
