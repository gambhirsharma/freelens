/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { object } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import resetThemeInjectable from "../../features/user-preferences/common/reset-theme.injectable";

import type { LensTheme } from "./lens-theme";

export type ApplyLensTheme = (theme: LensTheme) => void;

const applyLensThemeInjectable = getInjectable({
  id: "apply-lens-theme",
  instantiate: (di): ApplyLensTheme => {
    const logger = di.inject(loggerInjectionToken);
    const resetTheme = di.inject(resetThemeInjectable);

    return (theme) => {
      try {
        console.log("[THEME DEBUG][applyLensTheme] start", {
          frame: process.isMainFrame ? "root" : "cluster-iframe",
          name: theme.name,
          type: theme.type,
          primary: theme.colors.primary,
          documentReady: document.readyState,
          htmlExists: !!document.documentElement,
          bodyExists: !!document.body,
        });

        const colors = object.entries(theme.colors);

        // Set each CSS variable on document.documentElement
        for (const [name, value] of colors) {
          document.documentElement.style.setProperty(`--${name}`, value);
        }

        console.log("[THEME DEBUG][applyLensTheme] set CSS variables", {
          frame: process.isMainFrame ? "root" : "cluster-iframe",
          colorCount: colors.length,
          sampleVars: {
            primary: document.documentElement.style.getPropertyValue("--primary"),
            background: document.documentElement.style.getPropertyValue("--contentColor"),
          },
        });

        // Adding universal theme flag which can be used in component styles
        document.body.classList.toggle("theme-light", theme.type === "light");

        console.log("[THEME DEBUG][applyLensTheme] done", {
          frame: process.isMainFrame ? "root" : "cluster-iframe",
          primaryVar: getComputedStyle(document.documentElement)
            .getPropertyValue("--primary")
            .trim(),
          bodyClasses: Array.from(document.body.classList),
        });
      } catch (error) {
        logger.error("[THEME]: Failed to apply active theme", error);
        resetTheme();
      }
    };
  },
  causesSideEffects: true,
});

export default applyLensThemeInjectable;
