import * as vscode from 'vscode';

// Temporary folder TreeItem
export class TempFolderItem extends vscode.TreeItem {
    constructor(label: string, public readonly groupIdx: number, builtIn?: boolean) {
        super(label, vscode.TreeItemCollapsibleState.Collapsed);
        this.iconPath = vscode.ThemeIcon.Folder;
        this.contextValue = builtIn ? 'virtualTabsGroupBuiltIn' : 'virtualTabsGroup'; // Distinguish built-in and custom groups
        // Prevent accidental open on expand
        this.command = undefined;
    }
}

// File TreeItem in group, single click only selects, does not auto-open file
export class TempFileItem extends vscode.TreeItem {
    constructor(public readonly uri: vscode.Uri, public readonly groupIdx: number, isBuiltInGroup?: boolean) {
        super(uri, vscode.TreeItemCollapsibleState.None);
        this.resourceUri = uri;
        // Remove command property to prevent auto-open on click
        this.command = undefined;
        this.iconPath = vscode.ThemeIcon.File;
        this.tooltip = uri.fsPath;
        // Set different contextValue based on group type
        this.contextValue = isBuiltInGroup ? 'virtualTabsFileBuiltIn' : 'virtualTabsFileCustom';
    }
}