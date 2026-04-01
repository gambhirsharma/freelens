/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React, { useState } from "react";
import { SubTitle } from "../../../../../../renderer/components/layout/sub-title";
import { Select } from "../../../../../../renderer/components/select";
import { lensThemeDeclarationInjectionToken } from "../../../../../../renderer/themes/declaration";
import defaultLensThemeInjectable from "../../../../../../renderer/themes/default-theme.injectable";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";
import styles from "./theme.module.scss";

import type { LensTheme } from "../../../../../../renderer/themes/lens-theme";
import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";

interface Dependencies {
  state: UserPreferencesState;
  defaultTheme: LensTheme;
  themes: LensTheme[];
}

const DEFAULT_ACCENT_COLOR = "#00a7a0";

const PRESET_ACCENT_COLORS = [
  { value: "#00a7a0", label: "Teal" },
  { value: "#4caf50", label: "Green" },
  { value: "#2196f3", label: "Blue" },
  { value: "#ff9800", label: "Orange" },
];

const isValidHex = (hex: string) => /^#[0-9A-Fa-f]{6}$/.test(hex);

const ColorSwatch = ({ color }: { color: string }) => (
  <div className={styles.colorSwatch} style={{ backgroundColor: color }} />
);

const ColorOption = ({ option }: { option: { value: string; label: string } }) => (
  <div className={styles.colorOption}>
    <ColorSwatch color={option.value} />
    <span>{option.label}</span>
  </div>
);

const NonInjectedTheme = observer(({ state, themes, defaultTheme }: Dependencies) => {
  const [newColorHex, setNewColorHex] = useState("");
  const [newColorName, setNewColorName] = useState("");
  const [hexError, setHexError] = useState("");

  const themeOptions = [
    {
      value: "system",
      label: "Sync with computer",
    },
    ...themes.map((theme) => ({
      value: theme.name,
      label: theme.name,
    })),
  ];

  const customColors = state.customColors ?? [];
  const allAccentOptions = [...PRESET_ACCENT_COLORS, ...customColors];
  const currentColor = state.customAccentColor || DEFAULT_ACCENT_COLOR;

  const handleAddCustomColor = () => {
    const hex = newColorHex.trim();
    const name = newColorName.trim() || hex;

    if (!isValidHex(hex)) {
      setHexError("Enter a valid hex color (e.g. #ff5733)");
      return;
    }

    if (allAccentOptions.some((c) => c.value.toLowerCase() === hex.toLowerCase())) {
      setHexError("This color already exists");
      return;
    }

    state.customColors = [...customColors, { value: hex.toLowerCase(), label: name }];
    setNewColorHex("");
    setNewColorName("");
    setHexError("");
  };

  const handleDeleteCustomColor = (value: string) => {
    state.customColors = customColors.filter((c) => c.value !== value);
    if (state.customAccentColor === value) {
      state.customAccentColor = undefined;
    }
  };

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;

    if (val && !val.startsWith("#")) {
      val = `#${val}`;
    }
    setNewColorHex(val);
    setHexError("");
  };

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddCustomColor();
    }
  };

  return (
    <section id="appearance">
      <SubTitle title="Theme" />
      <div className={styles.selectRow}>
        <Select
          className={styles.themeSelect}
          id="theme-input"
          options={themeOptions}
          value={state.colorTheme}
          onChange={(value) => (state.colorTheme = value?.value ?? defaultTheme.name)}
          themeName="lens"
        />

        <Select
          className={styles.accentSelect}
          id="accent-color-select"
          options={allAccentOptions}
          value={currentColor}
          onChange={(value) => (state.customAccentColor = value?.value)}
          formatOptionLabel={(option) => <ColorOption option={option} />}
          themeName="lens"
        />
      </div>

      <div className={styles.colorPreview}>
        {currentColor !== DEFAULT_ACCENT_COLOR && (
          <button
            onClick={() => (state.customAccentColor = undefined)}
            className={styles.resetButton}
            title="Reset to default color"
          >
            Reset to Default
          </button>
        )}
      </div>

      {customColors.length > 0 && (
        <div className={styles.customColorsSection}>
          <div className={styles.customColorsSectionLabel}>Custom Colors</div>
          <div className={styles.customSwatchGrid}>
            {customColors.map((color) => (
              <div
                key={color.value}
                className={`${styles.customSwatchItem} ${currentColor === color.value ? styles.customSwatchActive : ""}`}
                title={`${color.label} (${color.value})`}
                onClick={() => (state.customAccentColor = color.value)}
              >
                <div className={styles.customSwatchColor} style={{ backgroundColor: color.value }} />
                <span className={styles.customSwatchLabel}>{color.label}</span>
                <button
                  className={styles.deleteSwatchBtn}
                  title={`Delete ${color.label}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCustomColor(color.value);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.addColorSection}>
        <div className={styles.addColorSectionLabel}>Add Custom Color</div>
        <div className={styles.addColorForm}>
          <div className={styles.hexInputWrapper}>
            <div
              className={styles.hexPreview}
              style={{
                backgroundColor: isValidHex(newColorHex.trim()) ? newColorHex.trim() : undefined,
              }}
            />
            <input
              className={styles.hexInput}
              type="text"
              placeholder="#ff5733"
              value={newColorHex}
              maxLength={7}
              onChange={handleHexInputChange}
              onKeyDown={handleAddKeyDown}
            />
          </div>
          <input
            className={styles.nameInput}
            type="text"
            placeholder="Color name (optional)"
            value={newColorName}
            onChange={(e) => setNewColorName(e.target.value)}
            onKeyDown={handleAddKeyDown}
          />
          <button className={styles.addColorBtn} onClick={handleAddCustomColor} disabled={!newColorHex.trim()}>
            Add
          </button>
        </div>
        {hexError && <div className={styles.hexError}>{hexError}</div>}
      </div>
    </section>
  );
});

export const Theme = withInjectables<Dependencies>(NonInjectedTheme, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
    defaultTheme: di.inject(defaultLensThemeInjectable),
    themes: di.injectMany(lensThemeDeclarationInjectionToken),
  }),
});
