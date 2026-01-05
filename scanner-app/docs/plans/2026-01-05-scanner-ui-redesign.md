# Scanner App UI Redesign

## Goal

Refocus the scanner UI on document viewing and search. Move scanner settings to a modal since they're one-time configuration, not frequent adjustments.

## Current State

- Scanner settings (resolution, color, duplex, feeder) occupy prominent space in main UI
- Image viewer has limited vertical space (~400px)
- Device selector and scan button in separate panel above viewer

## New Design

### Layout Changes

**Header:**
- Add gear icon next to existing language/theme controls
- Opens Scanner Settings modal

**Right Panel (Scanner Mode):**
- Remove Scanner Settings box entirely
- Viewer fills available height
- Enhanced toolbar at bottom contains all scanning controls

### Enhanced Toolbar

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Scanner ▼] [Scan]  │  ◀◀ ◀ 1/5 ▶ ▶▶  │  🔍- 🔍+ ↻  │  🗑 ✕  │
│   Device    Button   │   Navigation     │  Zoom/Rotate │  Delete  │
└─────────────────────────────────────────────────────────────────────┘
```

- **Left:** Compact device dropdown + Scan button (primary color)
- **Center:** Page navigation (first/prev/counter/next/last)
- **Right:** Zoom in/out, rotate, delete page, clear all

### Scanner Settings Modal

Triggered by gear icon in header. Contains:

- Scanner Device dropdown
- Resolution (100/150/200/300/600 DPI)
- Color Mode (Grayscale/B&W/RGB)
- Duplex toggle
- Auto Feeder toggle
- Auto Save toggle
- Service connection status banner

Settings apply immediately (no save button needed). Persist via existing zustand store with localStorage.

## Files to Modify

1. `Header.tsx` - Add settings gear icon
2. `page.tsx` - Remove ScanSettings, simplify scanner section
3. **New:** `ScannerSettingsModal.tsx` - Modal with device + settings
4. `DeviceSelector.tsx` - Add compact variant for toolbar

## Files Unchanged

- `ScanSettings.tsx` - Reused inside modal
- All zustand stores
- Left panel components

## Result

- Viewer gains ~150-200px vertical space
- Cleaner, document-focused interface
- Scanner settings accessible but not cluttering main workflow
