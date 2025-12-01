import * as vscode from 'vscode';
import { VTBookmark } from './types';

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

// File TreeItem in group
export class TempFileItem extends vscode.TreeItem {
    constructor(public readonly uri: vscode.Uri, public readonly groupIdx: number, isBuiltInGroup?: boolean) {
        super(uri, vscode.TreeItemCollapsibleState.None);
        this.resourceUri = uri;
        // Set command to open file on click
        this.command = {
            command: 'vscode.open',
            title: 'Open File',
            arguments: [uri]
        };
        this.iconPath = vscode.ThemeIcon.File;
        this.tooltip = uri.fsPath;
        // Set different contextValue based on group type
        this.contextValue = isBuiltInGroup ? 'virtualTabsFileBuiltIn' : 'virtualTabsFileCustom';
    }
}

/**
 * Bookmark TreeItem (v0.2.0)
 * Represents a code bookmark within a file
 */
export class BookmarkItem extends vscode.TreeItem {
    constructor(
        public readonly bookmark: VTBookmark,
        public readonly fileUri: vscode.Uri,
        public readonly groupIdx: number
    ) {
        super(
            `${bookmark.label} (line ${bookmark.line + 1})`,
            vscode.TreeItemCollapsibleState.None
        );

        this.contextValue = 'virtualTabsBookmark';
        this.iconPath = new vscode.ThemeIcon('bookmark');
        this.tooltip = this.createTooltip();
        this.description = `line ${bookmark.line + 1}`;

        // Click to jump to bookmark
        this.command = {
            command: 'virtualTabs.jumpToBookmark',
            title: 'Jump to Bookmark',
            arguments: [this]
        };
    }

    /**
     * Create rich tooltip with description and code preview
     */
    private createTooltip(): vscode.MarkdownString {
        const tooltip = new vscode.MarkdownString();
        tooltip.appendMarkdown(`**${this.bookmark.label}** (line ${this.bookmark.line + 1})\n\n`);

        if (this.bookmark.description) {
            tooltip.appendMarkdown(`*${this.bookmark.description}*\n\n`);
        }

        tooltip.appendMarkdown(`📁 ${this.fileUri.fsPath}\n`);
        tooltip.appendMarkdown(`⏰ Created: ${new Date(this.bookmark.created).toLocaleString()}`);

        if (this.bookmark.modified) {
            tooltip.appendMarkdown(`\n✏️ Modified: ${new Date(this.bookmark.modified).toLocaleString()}`);
        }

        return tooltip;
    }
}