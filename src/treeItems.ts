import * as vscode from 'vscode';

// 臨時資料夾 TreeItem
export class TempFolderItem extends vscode.TreeItem {
    constructor(label: string, public readonly groupIdx: number, builtIn?: boolean) {
        super(label, vscode.TreeItemCollapsibleState.Collapsed);
        this.iconPath = vscode.ThemeIcon.Folder;
        this.contextValue = builtIn ? 'virtualTabsGroupBuiltIn' : 'virtualTabsGroup'; // 區分內建與自訂群組
        // 避免點擊展開時誤觸
        this.command = undefined;
    }
}

// 分群內檔案 TreeItem，單擊僅選取，不自動開啟檔案
export class TempFileItem extends vscode.TreeItem {
    constructor(public readonly uri: vscode.Uri, public readonly groupIdx: number, isBuiltInGroup?: boolean) {
        super(uri, vscode.TreeItemCollapsibleState.None);
        this.resourceUri = uri;
        // 移除 command 屬性，避免單擊自動開啟檔案
        this.command = undefined;
        this.iconPath = vscode.ThemeIcon.File;
        this.tooltip = uri.fsPath;
        // 根據所屬群組類型設定不同的 contextValue
        this.contextValue = isBuiltInGroup ? 'virtualTabsFileBuiltIn' : 'virtualTabsFileCustom';
    }
}