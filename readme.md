# VirtualTabs – Custom File Grouping Beyond Folder Limitations

> **Break free from directory structure constraints. Organize files by logic or rules to boost development productivity.**

## 🔍 Project Overview

**VirtualTabs** is a VS Code extension that enables you to create temporary file groups based on logical relationships—independent of the original folder structure. Organize files by type, module, development phase, or custom rules. A tree view in the sidebar helps you build a flexible and efficient workflow.

## 🎯 Use Cases

* **Cross-directory management**: Group related files scattered across different folders (e.g., config, styles, source code).
* **Feature-based grouping**: Group files by module or functionality for focused development.
* **Project task switching**: Create quick-access file sets for specific tasks or sprints.
* **Code review**: Centralize files for review to improve efficiency.
* **Teaching & reference**: Build curated examples or materials without folder interference.
* **AI Collaboration & Multi-Issue Tracking**: Efficiently manage and group files scattered across various directories that are relevant to multiple development issues or when collaborating with AI coding assistants, ensuring all necessary context is at your fingertips.

---

## ✨ Key Features

### 📁 Group Management

* Add, delete, rename, and duplicate custom groups
* Built-in "Currently Open Files" group auto-syncs with VS Code tabs
* Auto-group files by extension (requires group selection)
* **NEW** Auto-group by modification date (Today, Yesterday, This Week, etc.)

### 🖱️ User Interface

* Multi-file selection and batch actions (open / close / remove)
* Drag and drop files into or between groups
* Smart click: single-click to select only, avoiding accidental file opening
* Flexible file removal (via icon or context menu)

### 📊 File Organization (v0.1.0)

* **Sort files within groups**:
  * Sort by name (A-Z with natural numeric ordering)
  * Sort by path
  * Sort by file extension
  * Sort by last modified time
  * Toggle ascending/descending order
  * Clear sorting to restore insertion order
* **Smart grouping**: Each group remembers its own sort preference
* **Auto-group by date**: Automatically organize files into time-based categories

### 📄 UI Example

> ![Feature Screenshot](assets/demo.png)

### 🛠️ Utilities

* Copy filename, relative path, or absolute path
* Open containing folder
* Auto-save group state (saved in `workspaceState`)

### 🌍 Multilingual Support

* Supports Traditional Chinese, Simplified Chinese, and English
* Automatically switches based on VS Code locale
* Community contributions for new languages are welcome

---

## 🚀 Why Choose VirtualTabs?

### 🧩 Solves Common Workflow Issues

In large projects, related files are often scattered:

* Config files → root directory
* Styles → `styles`
* Logic → `src` / `components`
* Tests → `tests` / `__tests__`

With VirtualTabs, you can:

✅ Create logical groups instantly

✅ Avoid changing original file locations

✅ Switch file sets based on task or context

This is especially crucial when working on tasks that span multiple issues or when coordinating with AI development partners, where related files can be numerous and dispersed.

---

## 📦 Installation & Usage

### Installation

1. Open VS Code
2. Press `Ctrl+Shift+X` (or `Cmd+Shift+X`)
3. Search for `VirtualTabs` and install

### Basic Usage

**Creating and Managing Groups:**

* Click the "Virtual Tabs" icon in the Activity Bar to open the view
* Right-click to create a new group
* Drag files into the group
* Right-click group → Auto-group by extension

**Sorting Files (v0.1.0):**

* Right-click a group → "Sort Files" submenu
* Choose sorting method: Name, Path, Extension, or Modified Time
* Use "Toggle Sort Order" to switch between ascending/descending
* Use "Clear Sorting" to restore original insertion order

**Auto-Group by Date (v0.1.0):**

* Right-click a group → "Auto Group by Modified Date"
* Files will be automatically organized into sub-groups:
  * Modified: Today
  * Modified: Yesterday
  * Modified: This Week
  * Modified: Last Week
  * Modified: This Month
  * Modified: Older

* Change VS Code locale to switch language

---

## 🌍 Language Support

Supported languages:

* Traditional Chinese (zh-tw)
* Simplified Chinese (zh-cn)
* English (en)

---

## ❓ FAQ

### Q1: I don’t see the Virtual Tabs view?

Please check:

* The extension is enabled
* Your VS Code version is above 1.75
* VirtualTabs has its own icon in the Activity Bar—look for it on the left

### Q2: How does Auto Group by Extension work?

1. Select a group to activate it
2. Right-click and choose "Auto Group by Extension"
3. The system will create sub-groups based on file extensions (e.g., `.js`, `.css`)

---

## 🔧 Developer Section

Interested in contributing? Check out [DEVELOPMENT.md](./DEVELOPMENT.md), which includes:

* Environment setup
* Debugging & publishing guide
* Module structure & data flow diagrams
* Common error troubleshooting

---

## 🤝 Contributing

We welcome community contributions:

* 🐞 Bug reports → [GitHub Issues](https://github.com/winterdrive/virtual-tabs/issues)
* ✨ Feature requests and UI suggestions
* 🔧 Code contributions (please fork and submit a PR)

---

## 📅 Roadmap

### ✅ v0.1.0 (Released)

* ✅ File sorting within groups (name, path, extension, modified time)
* ✅ Auto-group by modification date
* ✅ Per-group sort preferences
* ✅ Full i18n support (EN, ZH-TW, ZH-CN)

---
