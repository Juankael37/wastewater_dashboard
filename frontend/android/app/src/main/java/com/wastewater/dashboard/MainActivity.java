package com.wastewater.dashboard;

import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

/**
 * Main Activity — extends BridgeActivity to add WebView camera permission
 * handling required by getUserMedia() for the in-app timestamp camera.
 */
public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Grant WebView permission requests (camera for getUserMedia)
        this.bridge.getWebView().setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                // Auto-grant camera & audio permissions requested by the WebView
                request.grant(request.getResources());
            }
        });
    }
}
