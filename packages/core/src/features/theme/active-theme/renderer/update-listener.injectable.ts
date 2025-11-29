/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getMessageChannelListenerInjectable } from "@freelensapp/messaging";
import applyLensThemeInjectable from "../../../../renderer/themes/apply-lens-theme.injectable";
import { activeThemeUpdateChannel } from "../common/channel";

const activeThemeUpdateListenerInjectable = getMessageChannelListenerInjectable({
  channel: activeThemeUpdateChannel,
  id: "renderer",
  getHandler: (di) => {
    const applyLensTheme = di.inject(applyLensThemeInjectable);

    return (theme) => {
      console.log("[THEME DEBUG][update-listener] received theme update", {
        frame: process.isMainFrame ? "root" : "cluster-iframe",
        name: theme?.name,
        type: theme?.type,
        primary: theme?.colors?.primary,
      });

      // Store theme globally in cluster frames for persistence
      if (!process.isMainFrame) {
        (window as any).__lastReceivedTheme = theme;
        console.log("[THEME DEBUG][update-listener] stored theme in window for persistence");
      }

      applyLensTheme(theme);
      console.log("[THEME DEBUG][update-listener] applied theme", {
        frame: process.isMainFrame ? "root" : "cluster-iframe",
        primaryVar: getComputedStyle(document.documentElement)
          .getPropertyValue("--primary")
          .trim(),
        bodyClasses: Array.from(document.body.classList),
      });
    };
  },
});

export default activeThemeUpdateListenerInjectable;


