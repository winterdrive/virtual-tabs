# VirtualTabs – Organize Open Files into Smart Groups

> **自定義或以副檔名分群開啟中的檔案，讓 VS Code 編輯環境井然有序。**

## 🔍 專案簡介

**VirtualTabs** 是一款簡潔實用的 VS Code 擴充套件，可將所有**目前開啟的檔案依副檔名分群**，並在側邊欄新增「Virtual Tabs」TreeView 介面。適合多檔案編輯、切換頻繁的開發工作流程，幫助你更快速定位檔案、減少認知負擔。

---

## ✨ 主要功能

* 📁 **副檔名自動分群**：依據副檔名（如 `.ts`, `.json`）建立群組。
* 🌲 **TreeView 顯示介面**：於側邊欄 Explorer 中新增「Virtual Tabs」視圖。
* 🖱️ **可點選快速開檔**：點擊節點即可切換至對應檔案。
* 🔄 **即時同步（僅限「目前已開啟檔案」群組）**：開啟、關閉檔案時「目前已開啟檔案」群組會自動更新。自訂群組需手動加入/移除檔案。
* 🗂️ **自訂群組管理**：可新增、刪除、複製、重命名自訂群組。
* 🖱️ **多選檔案操作**：支援多選檔案一鍵開啟、關閉、移除。
* 🗑️ **單一檔案移除**：非內建群組的檔案可透過右鍵選單或垃圾桶圖示快速移除。
* 🖱️ **拖曳檔案至群組**：可將檔案拖曳到自訂群組進行分組。
* 📋 **複製檔名／相對路徑**：檔案右鍵選單可快速複製檔名或相對路徑到剪貼簿。

### UI 範例圖

> ![功能截圖](assets/demo.png)

---

## ⚠️ 注意事項

* 只有「目前已開啟檔案」群組會自動同步 VS Code 的開啟/關閉狀態。
* 其他自訂群組需手動加入、移除檔案。
* 目前僅支援依副檔名自動分群，尚未支援以資料夾路徑、關鍵字等自訂規則。

---

## ⚙️ 安裝與使用

### 1. 安裝依賴

```bash
npm install
```

### 2. 編譯原始碼

```bash
npm run vscode:prepublish
```

### 3. 啟動 Extension Host

於 VS Code 按下 `F5`，開啟開發者模式，側邊欄將出現「Virtual Tabs」視圖。

---

## 🧩 檔案結構與模組設計

### 目錄總覽

```text
editorGrouper/
├── package.json           # 擴充套件描述與註冊點
├── tsconfig.json          # TypeScript 編譯設定
├── readme.md              # 使用與開發說明
├── architecture.md        # 架構文件
└── src/
    ├── extension.ts       # 擴充套件主程式
    ├── types.ts           # 資料結構定義
    ├── treeItems.ts       # TreeView 項目定義
    ├── provider.ts        # 分群資料與 TreeView 提供者
    ├── dragAndDrop.ts     # 拖曳控制器
    └── commands.ts        # 指令註冊與邏輯實作
```

### 模組職責說明

| 模組檔案             | 功能簡述                               |
| ---------------- | ---------------------------------- |
| `extension.ts`   | 初始化 provider、D&D 控制器與指令註冊。        |
| `provider.ts`    | 實作 `TreeDataProvider`，負責群組資料與樹狀結構。 |
| `treeItems.ts`   | 定義 `TreeItem` 類別，控制顯示與互動行為。每個檔案項目都記錄其所屬群組索引。        |
| `types.ts`       | 定義 `TempGroup` 等共用資料結構。            |
| `dragAndDrop.ts` | 實作拖曳控制邏輯（拖曳檔案至群組）。                 |
| `commands.ts`    | 註冊並處理如新增群組、刪除群組、單一檔案移除等 VS Code 指令。       |

### 模組互動圖

```mermaid
flowchart TD
    extension.ts --> provider.ts
    extension.ts --> dragAndDrop.ts
    extension.ts --> commands.ts
    provider.ts --> treeItems.ts
    provider.ts --> types.ts
    dragAndDrop.ts --> provider.ts
    dragAndDrop.ts --> treeItems.ts
    commands.ts --> provider.ts
    commands.ts --> treeItems.ts
    treeItems.ts --> types.ts
```

---

## 🔁 資料流簡介

1. `extension.ts` 啟動時初始化 `provider`、拖曳控制器與指令。
2. `provider` 載入已開啟檔案，依副檔名分群。
3. 使用者與 UI 互動（如點擊、拖曳、指令）將更新 `provider` 中的資料。
4. 群組資料更新後，自動儲存至 `workspaceState` 並觸發 UI 刷新。
5. 資料結構：

  ```mermaid
      flowchart TD
        %% 資料層
        TempGroup["TempGroup[] 群組資料陣列"] --> |包含| Files["string[] 檔案URI陣列"]
        TempGroup --> |有屬性| GroupProperties["群組屬性"]
        GroupProperties --> BuiltIn["builtIn?: boolean 是否為內建群組"]
        GroupProperties --> Auto["auto?: boolean 是否為自動分群"]
        GroupProperties --> Name["name: string 群組名稱"]

        %% UI層轉換
        TempFoldersProvider["TempFoldersProvider 資料提供者"] --> |管理| TempGroup
        TempFoldersProvider --> |轉換為| TreeItems["TreeItem UI層"]

        %% TreeItem 類型
        TreeItems --> FolderItem["TempFolderItem 群組節點"]
        TreeItems --> FileItem["TempFileItem 檔案節點"]

        %% 檔案節點的屬性
        FileItem --> |參照| VSCodeUri["vscode.Uri 檔案資源位址"]
        FileItem --> |記錄| GroupIndex["groupIdx: number 所屬群組索引"]

        %% 操作層
        DragAndDrop["TempFoldersDragAndDropController 拖曳控制器"] --> |操作| TempFoldersProvider
        Commands["命令註冊"] --> |直接操作| TempGroup
        Commands --> |透過索引定位| GroupIndex

```

6. 實際使用範例：

**資料層 (TempGroup)**：
這是實際儲存的資料結構，存在於記憶體和 workspaceState 中：

```json
const groups: TempGroup[] = [
    {
        name: "目前已開啟檔案",  // 群組名稱
        files: [
            "file:///c:/project/file1.ts",
            "file:///c:/project/file2.json"
        ],
        builtIn: true  // 這是內建群組
    },
    {
        name: "TypeScript 檔案",  // 自動分類的群組
        files: [
            "file:///c:/project/file1.ts",
            "file:///c:/project/file3.ts"
        ],
        auto: true  // 這是自動分群群組
    },
    {
        name: "我的自訂群組",  // 使用者自訂群組
        files: [
            "file:///c:/project/file1.ts",
            "file:///c:/project/file2.json"
        ]
        // 非內建也非自動
    }
];
```

**UI 顯示層 (TreeItems)**：
`TempGroup` 資料會被轉換成 TreeView 項目供 VS Code 顯示：

```typescript
// 群組節點 (對應 TempGroup)
new TempFolderItem("TypeScript 檔案", 1, false)
    ├── new TempFileItem(Uri.file("file1.ts"), 1, false)  // 檔案節點，記錄群組索引
    └── new TempFileItem(Uri.file("file3.ts"), 1, false)  // 檔案節點，記錄群組索引
```

**轉換流程**：

1. `TempGroup[]` 資料 → `TempFoldersProvider.getChildren()`
2. → `TempFolderItem` (群組節點) + `TempFileItem[]` (檔案節點)
3. → VS Code TreeView 顯示

---

## 🛠️ 設定與配置

### package.json（重點節錄）

```json
{
  "name": "virtual-tabs",
  "displayName": "VirtualTabs",
  "description": "Group open tabs by file type in a sidebar view",
  "main": "./dist/extension.js",
  "activationEvents": ["*"],
  "contributes": {
    "views": {
      "explorer": [
        {
          "id": "virtualTabsView",
          "name": "Grouped Tabs"
        }
      ]
    }
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES6",
    "module": "commonjs",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true
  },
  "include": ["src"]
}
```

---

## ❓ 常見問題（FAQ）

### 為什麼沒有看到「Grouped Tabs」視圖？

請確認是否正確啟動 Extension Host（按下 `F5`），並查看左側邊欄的 Explorer 分頁。

### 可以自訂分群邏輯嗎？

目前僅支援依據副檔名自動分群。未來將加入以**資料夾路徑**、**關鍵字**等自訂規則。

### 如何移除群組中的單一檔案？

對於非內建群組（如自訂群組），您可以：

1. 在檔案項目上右鍵點擊，選擇「從群組移除檔案」
2. 點擊檔案項目旁的垃圾桶圖示
注意：「目前已開啟檔案」等內建群組不支援單一檔案移除。

---

## 🔧 未來規劃

* 🧩 自訂分群條件（路徑/關鍵字/正則等）
* ⚙️ 設定介面：可視化配置分群邏輯
* 🔁 儲存/還原分群設定

---

## 🤝 貢獻方式

我們歡迎任何形式的貢獻！

* 💬 回報錯誤與需求：請透過 [GitHub Issues](https://github.com/winterdrive/virtual-tabs/issues)。
* ✨ 新功能或改善 UI：歡迎提出 [Pull Request](https://github.com/winterdrive/virtual-tabs/pulls)。
* 📖 文件改進：發現敘述不清歡迎協助修正。

---

## 📄 授權條款

本專案採用 MIT 授權，可自由使用、修改與再發佈。

---
