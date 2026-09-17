'use client';

import { useState, useEffect, useRef } from 'react';
import { Palette, Check, ChevronDown } from 'lucide-react';
import { THEMES, ThemeId, getStoredTheme, setStoredTheme } from '../../lib/themes';

export default function ThemeSelector() {
  const [theme, setTheme] = useState<ThemeId>('cosmic');
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize theme from storage
  useEffect(() => {
    const saved = getStoredTheme();
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const selectTheme = (id: ThemeId) => {
    setTheme(id);
    setStoredTheme(id);
    setOpen(false);
  };

  const currentTheme = THEMES.find((t) => t.id === theme) || THEMES[0];

  return (
    <div className="theme-selector-wrap" ref={dropdownRef}>
      <button
        type="button"
        className="theme-btn"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Current theme: ${currentTheme.name}. Click to change theme.`}
        title="Switch color theme"
      >
        <Palette size={13} className="theme-icon" />
        <span className="theme-swatch">
          <span style={{ background: currentTheme.accent }} />
          <span style={{ background: currentTheme.secondary }} />
        </span>
        <span className="theme-name">{currentTheme.shortName}</span>
        <ChevronDown size={11} className={`theme-chevron ${open ? 'rotated' : ''}`} />
      </button>

      {open && (
        <div className="theme-dropdown" role="listbox" aria-label="Select color theme">
          <div className="theme-dropdown-header">
            <span>PALETTE HUD</span>
            <small>TOP-DOWN OVERWORLD THEMES</small>
          </div>
          <div className="theme-options">
            {THEMES.map((t) => {
              const isSelected = t.id === theme;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`theme-option ${isSelected ? 'active' : ''}`}
                  onClick={() => selectTheme(t.id)}
                >
                  <div className="theme-option-left">
                    <span className="theme-option-emoji">{t.icon}</span>
                    <div className="theme-option-info">
                      <div className="theme-option-title">
                        <b>{t.name}</b>
                        {isSelected && <span className="theme-active-tag">ACTIVE</span>}
                      </div>
                      <span className="theme-option-tagline">{t.tagline}</span>
                    </div>
                  </div>
                  <div className="theme-option-right">
                    <div className="theme-swatch-box" title={`${t.accent} / ${t.secondary}`}>
                      <span style={{ background: t.accent }} />
                      <span style={{ background: t.secondary }} />
                    </div>
                    {isSelected && <Check size={13} className="theme-check" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
