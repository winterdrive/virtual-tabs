# Changelog

All notable changes to the "VirtualTabs" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-12-01

### ✨ Added

#### File Sorting (Issue #4)

- **Sort files within groups** by multiple criteria:
  - Sort by name (with natural numeric ordering, e.g., file1, file2, file10)
  - Sort by path
  - Sort by file extension (files with same extension grouped together)
  - Sort by last modified time
- **Toggle sort order**: Switch between ascending and descending
- **Clear sorting**: Restore original insertion order
- **Per-group preferences**: Each group remembers its own sort settings

#### Auto-Group by Modified Date (Issue #6)

- **Time-based auto-grouping**: Automatically organize files into date categories
- **Project-relative dates**: Uses the newest file in the project as reference
- **Six time categories**:
  - Modified: Today
  - Modified: Yesterday
  - Modified: This Week
  - Modified: Last Week
  - Modified: This Month
  - Modified: Older

#### Technical Improvements

- **Refactored data model**: Extended `TempGroup` interface with new fields
  - `id`: Unique identifier for each group
  - `sortBy`: Sort criteria preference
  - `sortOrder`: Ascending or descending
  - `groupBy`: Grouping strategy
  - `metadata`: Reserved for future features
- **New modules**:
  - `src/sorting.ts`: FileSorter class with intelligent sorting algorithms
  - `src/grouping.ts`: FileGrouper class for date-based grouping
- **Backward compatibility**: Automatic migration of existing groups

#### UI Enhancements

- **Sort Files submenu**: Right-click group → "Sort Files" with all sorting options
- **Visual feedback**: Sorted files display in real-time
- **Localized menus**: All new features fully translated

### 🌍 Internationalization

- Full i18n support for all new features
- English (en)
- Traditional Chinese (zh-tw)
- Simplified Chinese (zh-cn)

### 🔧 Technical Details

- TypeScript compilation optimized
- Performance improvements for large file sets (tested with 1000+ files)
- Error handling for edge cases (missing files, invalid paths)

### 📝 Documentation

- Updated README with new feature descriptions
- Created comprehensive implementation plan
- Added testing guide with detailed test cases

---

## [0.0.9] - Previous Release

### Core Features

- Custom file groups independent of folder structure
- Built-in "Currently Open Files" group
- Auto-group by file extension
- Multi-file selection and batch operations
- Drag and drop support
- Copy file paths (name, relative, absolute)
- Multilingual support (EN, ZH-TW, ZH-CN)
- Smart click behavior
- Auto-save group state

---

## Roadmap

Future updates will be announced based on user feedback and community requests.

---

## Links

- [GitHub Repository](https://github.com/winterdrive/virtual-tabs)
- [Issue #4 - File Sorting](https://github.com/winterdrive/virtual-tabs/issues/4) ✅ Resolved in v0.1.0
- [Issue #6 - Auto-Group by Date](https://github.com/winterdrive/virtual-tabs/issues/6) ✅ Resolved in v0.1.0
