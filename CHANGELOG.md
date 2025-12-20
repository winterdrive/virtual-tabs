# Change Log

All notable changes to the "VirtualTabs" extension will be documented in this file.

## [0.3.1] - 2025-12-20

### Changed

- Allow duplicate group names when IDs differ.

### Added

- Persist group/bookmark data to `virtualTab.json` at the workspace root instead of `workspaceState`.
- Added automatic migration from existing `workspaceState` data when the file is missing.
- Store file references in `virtualTab.json` as paths relative to the workspace root.

## [0.3.0] - 2025-12-13

### Added

- **Sub-Groups & Nested Structure**: Create hierarchical group organization by adding sub-groups or dragging groups onto each other.
- **AI Context Export**: Copy all files in a group as LLM-ready markdown with "Copy Context for AI" command.
- **Unified Copy Menu**: New submenu with smart behavior - copies work differently on groups vs files.
- **Directory Drag & Drop**: Drag folders from Explorer to recursively add all files within.
- **Copy/Paste/Delete Commands**: Full clipboard operations for files and groups within VirtualTabs.
- **Multi-select Delete**: Delete multiple groups or files at once.
- **File Move with Bookmarks**: Dragging files between groups preserves their bookmarks.

### Changed

- Groups now require unique IDs for stable references (auto-migrated from older versions).
- Improved drag-and-drop controller with better file/group/directory detection.
- Context menus reorganized with separate submenus for different item types.
- Copy File Name/Path commands now work on groups (copies all files recursively).

### Fixed

- Fixed circular nesting detection when dragging groups.
- Fixed bookmark preservation when moving files between groups.
- Improved error handling for large file context copying.

## [0.2.0] - 2025-12-01

### Added

- **Task-Oriented Bookmarks**: You can now add bookmarks to specific lines of code within your VirtualTabs groups.
- **Smart Flow**: Right-click to add bookmarks instantly without annoying input boxes. The system automatically labels them based on line content.
- **Bookmark Navigation**: Click on a bookmark in the sidebar to jump directly to the code location.
- **Bookmark Management**: Edit bookmark labels and descriptions, or remove them via the context menu.

### Changed

- Improved TreeView performance when handling groups with many files.
- Updated `package.json` to include new bookmark commands and menus.
- Refined UI for file items in the sidebar (click to open).

### Fixed

- Fixed an issue where file icons might not display correctly in some themes.

## [0.1.0] - 2025-11-20

### Added

- Initial release of VirtualTabs.
- Custom file grouping.
- Built-in "Open Editors" group.
- File sorting (Name, Path, Extension, Modified Time).
- Auto-group by modification date.
- Internationalization (i18n) support for English, Traditional Chinese, and Simplified Chinese.
