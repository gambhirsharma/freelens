/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { reaction } from "mobx";
import { broadcastMessage } from "../../common/ipc";
import initializeSystemThemeTypeInjectable from "../../features/theme/system-type/renderer/initialize.injectable";
import initUserStoreInjectable from "../../features/user-preferences/renderer/load-storage.injectable";
import { beforeFrameStartsSecondInjectionToken } from "../before-frame-starts/tokens";
import activeThemeInjectable from "./active.injectable";
import applyLensThemeInjectable from "./apply-lens-theme.injectable";
import { activeThemeUpdateChannel } from "../../features/theme/active-theme/common/channel";

// Note: Due to cross-origin restrictions (iframes use different subdomains with HTTPS),
// we cannot directly access iframe.contentDocument from the parent frame.
// Theme synchronization is handled via IPC (broadcastMessage/listener system)

const setupApplyActiveThemeInjectable = getInjectable({
  id: "setup-apply-active-theme",
  instantiate: (di) => ({
    run: () => {
      const activeTheme = di.inject(activeThemeInjectable);
      const applyLensTheme = di.inject(applyLensThemeInjectable);
      
      // Store current theme for new iframes
      let currentTheme: any = null;

      // Root frame: watch activeTheme and broadcast to cluster frames
      if (process.isMainFrame) {
        reaction(
          () => activeTheme.get(),
          (theme) => {
            console.log("[THEME DEBUG][setup-apply-active-theme] reaction (root)", {
              name: theme.name,
              type: theme.type,
              primary: theme.colors.primary,
            });

            currentTheme = theme;

            // Apply theme to root frame
            applyLensTheme(theme);

            // Broadcast theme to all cluster iframes via IPC
            console.log("[THEME DEBUG][setup-apply-active-theme] broadcasting via IPC");
            broadcastMessage(activeThemeUpdateChannel.id, theme);
          },
          {
            fireImmediately: true,
          },
        );
      } else {
        // Cluster frame: apply theme immediately on initialization
        // This ensures the theme is applied even if IPC messages are missed during startup
        console.log("[THEME DEBUG][setup-apply-active-theme] cluster frame initializing, applying theme immediately");
        const theme = activeTheme.get();
        console.log("[THEME DEBUG][setup-apply-active-theme] cluster frame initial theme", {
          name: theme.name,
          type: theme.type,
          primary: theme.colors.primary,
        });

        // Store for persistence layer
        currentTheme = theme;
        (window as any).__lastReceivedTheme = theme;

        // Apply immediately
        applyLensTheme(theme);

        // Also set up a reaction to watch for changes
        // (though updates should primarily come via IPC for consistency)
        reaction(
          () => activeTheme.get(),
          (theme) => {
            console.log("[THEME DEBUG][setup-apply-active-theme] cluster frame theme changed locally", {
              name: theme.name,
              type: theme.type,
              primary: theme.colors.primary,
            });

            currentTheme = theme;
            (window as any).__lastReceivedTheme = theme;
            applyLensTheme(theme);
          },
        );
      }
      
      // Watch for new iframes being added and broadcast theme via IPC
      if (process.isMainFrame) {
        // Wait for lens-views container to be available
        const waitForLensViews = () => {
          const lensViewsContainer = document.getElementById('lens-views');
          
          if (!lensViewsContainer) {
            setTimeout(waitForLensViews, 50);
            return;
          }
          
          console.log("[THEME DEBUG][setup-apply-active-theme] setting up iframe observer");
          
          const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
              for (const node of Array.from(mutation.addedNodes)) {
                if (node instanceof HTMLIFrameElement && currentTheme) {
                  console.log("[THEME DEBUG][setup-apply-active-theme] new iframe detected", {
                    iframeId: node.id,
                    src: (node as HTMLIFrameElement).src,
                  });

                  // Broadcast theme via IPC when iframe loads
                  // (Can't access contentDocument due to cross-origin restrictions)
                  node.addEventListener("load", () => {
                    console.log("[THEME DEBUG][setup-apply-active-theme] iframe load event fired", {
                      iframeId: node.id,
                    });

                    // Broadcast immediately
                    broadcastMessage(activeThemeUpdateChannel.id, currentTheme);

                    // Broadcast again after delays to ensure iframe's listener is ready
                    // This handles race conditions where the iframe's DI container
                    // might not be fully initialized when the load event fires
                    setTimeout(() => {
                      console.log("[THEME DEBUG][setup-apply-active-theme] re-broadcasting theme (50ms)", {
                        iframeId: node.id,
                      });
                      broadcastMessage(activeThemeUpdateChannel.id, currentTheme);
                    }, 50);

                    setTimeout(() => {
                      console.log("[THEME DEBUG][setup-apply-active-theme] re-broadcasting theme (150ms)", {
                        iframeId: node.id,
                      });
                      broadcastMessage(activeThemeUpdateChannel.id, currentTheme);
                    }, 150);

                    setTimeout(() => {
                      console.log("[THEME DEBUG][setup-apply-active-theme] re-broadcasting theme (300ms)", {
                        iframeId: node.id,
                      });
                      broadcastMessage(activeThemeUpdateChannel.id, currentTheme);
                    }, 300);
                  }, { once: true });
                }
              }
            }
          });
          
          observer.observe(lensViewsContainer, { childList: true, subtree: true });
          console.log("[THEME DEBUG][setup-apply-active-theme] watching for new iframes in #lens-views");

          // Check for any existing iframes that may have already been added
          const existingIframes = lensViewsContainer.querySelectorAll('iframe');
          if (existingIframes.length > 0 && currentTheme) {
            console.log("[THEME DEBUG][setup-apply-active-theme] found existing iframes, broadcasting theme", {
              count: existingIframes.length,
            });

            // Broadcast immediately for any existing iframes
            broadcastMessage(activeThemeUpdateChannel.id, currentTheme);

            // Broadcast again with delays to ensure they receive it
            setTimeout(() => {
              console.log("[THEME DEBUG][setup-apply-active-theme] re-broadcasting for existing iframes (50ms)");
              broadcastMessage(activeThemeUpdateChannel.id, currentTheme);
            }, 50);

            setTimeout(() => {
              console.log("[THEME DEBUG][setup-apply-active-theme] re-broadcasting for existing iframes (150ms)");
              broadcastMessage(activeThemeUpdateChannel.id, currentTheme);
            }, 150);
          }
        };

        waitForLensViews();
      }
    },
    runAfter: [initializeSystemThemeTypeInjectable, initUserStoreInjectable],
  }),
  injectionToken: beforeFrameStartsSecondInjectionToken,
});

export default setupApplyActiveThemeInjectable;
