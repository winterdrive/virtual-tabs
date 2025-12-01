import * as vscode from 'vscode';
import { TempGroup, SortCriteria, DateGroup } from './types';
import { TempFileItem, TempFolderItem, BookmarkItem } from './treeItems';
import { I18n } from './i18n';
import { FileSorter } from './sorting';
import { FileGrouper } from './grouping';
import { BookmarkManager } from './bookmarks';

// TreeDataProvider implementation
export class TempFoldersProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null> = new vscode.EventEmitter();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    // In-memory group array
    public groups: TempGroup[] = [];
    private context?: vscode.ExtensionContext;
    private treeView?: vscode.TreeView<vscode.TreeItem>;

    constructor(context?: vscode.ExtensionContext) {
        this.context = context;
        this.loadGroups();
        if (this.groups.length === 0) {
            this.initBuiltInGroup();
        }
    }

    // Save TreeView reference for multi-select management
    setTreeView(treeView: vscode.TreeView<vscode.TreeItem>): void {
        this.treeView = treeView;
    }

    // Get currently selected file items
    getSelectedFileItems(): TempFileItem[] {
        if (!this.treeView) return [];

        // Ensure selection is an array
        const selection = this.treeView.selection || [];

        // Filter all items of type TempFileItem
        const fileItems = selection.filter((item): item is TempFileItem => item instanceof TempFileItem);

        // Log the number of selected items for debugging
        if (fileItems.length > 0) {
            console.log(`已選取 ${fileItems.length} 個檔案項目`);
        }

        return fileItems;
    }

    private saveGroups() {
        if (this.context) {
            this.context.workspaceState.update('virtualTabs.groups', this.groups);
        }
    }

    private loadGroups() {
        if (this.context) {
            const saved = this.context.workspaceState.get<TempGroup[]>('virtualTabs.groups');
            if (saved && Array.isArray(saved)) {
                // Migration: Ensure v0.2.0 compatibility
                // Add empty bookmarks object for groups that don't have one
                this.groups = saved.map(group => ({
                    ...group,
                    bookmarks: group.bookmarks || {}
                }));
            }
        }
    }

    private initBuiltInGroup() {
        // Get all open editor files
        const openUris = vscode.window.tabGroups.all
            .flatMap(g => g.tabs)
            .map(tab => (tab.input as any)?.uri as vscode.Uri)
            .filter((uri): uri is vscode.Uri => !!uri)
            .map(uri => uri.toString());
        this.groups.unshift({ name: I18n.getBuiltInGroupName(), files: openUris, builtIn: true });
    }

    refresh(): void {
        // Resync built-in group content
        const builtIn = this.groups.find(g => g.builtIn);
        if (builtIn) {
            const openUris = vscode.window.tabGroups.all
                .flatMap(g => g.tabs)
                .map(tab => (tab.input as any)?.uri as vscode.Uri)
                .filter((uri): uri is vscode.Uri => !!uri)
                .map(uri => uri.toString());
            builtIn.files = openUris;
        }
        this.saveGroups();
        this._onDidChangeTreeData.fire(undefined);
    }

    addGroup() {
        // Auto-generate name: New Group 1, 2, ...
        let idx = 1;
        let name = I18n.getGroupName(undefined, idx);
        while (this.groups.some(g => g.name === name)) {
            idx++;
            name = I18n.getGroupName(undefined, idx);
        }
        this.groups.push({ name, files: [] });
        this.refresh();
    }

    removeGroup(idx: number) {
        // Cannot remove built-in group
        if (this.groups[idx]?.builtIn) return;
        this.groups.splice(idx, 1);
        this.refresh();
    }

    addFilesToGroup(groupIdx: number, uris: string[]) {
        const group = this.groups[groupIdx];
        if (!group) return;
        if (!group.files) group.files = [];
        // Avoid duplicates
        for (const uri of uris) {
            if (!group.files.includes(uri)) {
                group.files.push(uri);
            }
        }
        this.refresh();
    }

    // One-click open all files in group (only for custom groups)
    async openAllFilesInGroup(idx: number) {
        const group = this.groups[idx];
        // Skip if built-in group
        if (!group || group.builtIn) return;

        const files = group.files || [];
        if (files.length > 0) {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: I18n.getMessage('progress.openingFiles', group.name),
                cancellable: false
            }, async (progress) => {
                const total = files.length;
                let openedCount = 0;
                const step = 100 / total;

                // 有序地開啟檔案，每次開啟後等待一小段時間
                for (const uriStr of files) {
                    try {
                        const uri = vscode.Uri.parse(uriStr);
                        await vscode.commands.executeCommand('vscode.open', uri, { preview: false });
                        openedCount++;
                        progress.report({
                            increment: step,
                            message: I18n.getMessage('progress.fileCount', openedCount.toString(), total.toString())
                        });
                        // 給系統一點時間處理
                        await new Promise(resolve => setTimeout(resolve, 100));
                    } catch (e) {
                        console.error(I18n.getMessage('error.cannotOpenFile', uriStr), e);
                    }
                }
            });
        } else {
            vscode.window.showInformationMessage(I18n.getMessage('message.noFilesToOpen', group.name));
        }
    }

    // One-click close all files in group (only for custom groups)
    async closeAllFilesInGroup(idx: number) {
        const group = this.groups[idx];
        // Skip if built-in group
        if (!group || group.builtIn) return;

        const files = group.files || [];
        if (files.length > 0) {
            // 顯示進度通知
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: I18n.getMessage('progress.closingFiles', group.name),
                cancellable: false
            }, async (progress) => {
                const total = files.length;
                let closedCount = 0;
                const step = 100 / total;

                // 轉換為 URI 對象
                const uris = files.map(uriStr => {
                    try {
                        return vscode.Uri.parse(uriStr);
                    } catch (e) {
                        console.error(I18n.getMessage('error.cannotParseUri', uriStr), e);
                        return null;
                    }
                }).filter((uri): uri is vscode.Uri => uri !== null);

                // 找出所有已開啟的標籤頁
                const tabsToClose: vscode.Tab[] = [];
                vscode.window.tabGroups.all.forEach(tabGroup => {
                    tabGroup.tabs.forEach(tab => {
                        const tabUri = (tab.input as any)?.uri;
                        if (tabUri) {
                            const tabUriStr = tabUri.toString();
                            if (files.includes(tabUriStr)) {
                                tabsToClose.push(tab);
                            }
                        }
                    });
                });

                // 逐一關閉標籤頁，每次關閉後等待一小段時間
                for (const tab of tabsToClose) {
                    try {
                        await vscode.window.tabGroups.close(tab);
                        closedCount++;
                        progress.report({
                            increment: step,
                            message: I18n.getMessage('progress.fileCount', closedCount.toString(), tabsToClose.length.toString())
                        });
                        // 給系統一點時間處理
                        await new Promise(resolve => setTimeout(resolve, 50));
                    } catch (e) {
                        console.error(I18n.getMessage('error.cannotCloseTab'), e);
                    }
                }

            });
        } else {
            vscode.window.showInformationMessage(I18n.getMessage('message.noFilesToClose', group.name));
        }
    }

    // 開啟多個選取的檔案
    async openSelectedFiles(fileItems: TempFileItem[]) {
        if (fileItems.length === 0) return;

        // 顯示進度通知
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: I18n.getMessage('progress.openingSelected'),
            cancellable: false
        }, async (progress) => {
            const total = fileItems.length;
            let openedCount = 0;
            const step = 100 / total;

            // 有序地開啟檔案
            for (const item of fileItems) {
                try {
                    await vscode.commands.executeCommand('vscode.open', item.uri);
                    openedCount++;
                    progress.report({
                        increment: step,
                        message: I18n.getMessage('progress.fileCount', openedCount.toString(), total.toString())
                    });
                    // 給系統一點時間處理
                    await new Promise(resolve => setTimeout(resolve, 100));
                } catch (e) {
                    console.error(I18n.getMessage('error.cannotOpenFile', item.uri.toString()), e);
                }
            }
        });
    }

    // 關閉多個選取的檔案
    async closeSelectedFiles(fileItems: TempFileItem[]) {
        if (fileItems.length === 0) return;

        // 顯示進度通知
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: I18n.getMessage('progress.closingSelected'),
            cancellable: false
        }, async (progress) => {
            const total = fileItems.length;
            let closedCount = 0;
            const step = 100 / total;

            const uriStrings = fileItems.map(item => item.uri.toString());

            // 收集要關閉的標籤頁
            const tabsToClose: vscode.Tab[] = [];
            vscode.window.tabGroups.all.forEach(tabGroup => {
                tabGroup.tabs.forEach(tab => {
                    const tabUri = (tab.input as any)?.uri;
                    if (tabUri && uriStrings.includes(tabUri.toString())) {
                        tabsToClose.push(tab);
                    }
                });
            });

            // 逐一關閉標籤頁
            for (const tab of tabsToClose) {
                try {
                    await vscode.window.tabGroups.close(tab);
                    closedCount++;
                    progress.report({
                        increment: step,
                        message: I18n.getMessage('progress.fileCount', closedCount.toString(), tabsToClose.length.toString())
                    });
                    // 給系統一點時間處理
                    await new Promise(resolve => setTimeout(resolve, 50));
                } catch (e) {
                    console.error(I18n.getMessage('error.cannotCloseTab'), e);
                }
            }

        });
    }

    // 從群組中移除多個選取的檔案
    removeFilesFromGroup(groupIdx: number, fileItems: TempFileItem[]) {
        const group = this.groups[groupIdx];
        if (!group || !group.files || fileItems.length === 0) return;

        // 確保所有選取的檔案都在指定群組中
        const uriStrings = fileItems.map(item => item.uri.toString());

        // 從指定群組中移除檔案
        group.files = group.files.filter(uriStr => !uriStrings.includes(uriStr));


        this.refresh();
    }

    // 將多個選取的檔案加入到指定群組
    addMultipleFilesToGroup(groupIdx: number, fileItems: TempFileItem[]) {
        if (fileItems.length === 0) return;

        const uriStrings = fileItems.map(item => item.uri.toString());
        this.addFilesToGroup(groupIdx, uriStrings);
    }

    /**
     * Only auto-group by extension for files in the user-selected group.
     * If no group is selected, show a prompt. No longer fallback to all open files.
     */
    addAutoGroupsByExt() {
        // Only allow single group selection
        if (!this.treeView || this.treeView.selection.length !== 1 || !(this.treeView.selection[0] instanceof TempFolderItem)) {
            vscode.window.showInformationMessage(I18n.getMessage('message.pleaseSelectGroup'));
            return;
        }
        const groupIdx = (this.treeView.selection[0] as TempFolderItem).groupIdx;
        const group = this.groups[groupIdx];
        if (!group || !group.files || group.files.length === 0) {
            vscode.window.showInformationMessage(I18n.getMessage('message.noFilesToGroup'));
            return;
        }
        // Group by extension
        const extMap: Record<string, string[]> = {};
        for (const uriStr of group.files) {
            try {
                const uri = vscode.Uri.parse(uriStr);
                const ext = uri.fsPath.split('.').pop()?.toLowerCase() || 'other';
                if (!extMap[ext]) extMap[ext] = [];
                extMap[ext].push(uriStr);
            } catch { }
        }
        // Remove old auto groups
        this.groups = this.groups.filter((g, idx) => g.builtIn || !g.auto || idx === groupIdx);
        // Insert auto groups at the original group position
        const newGroups = Object.entries(extMap).map(([ext, files]) => ({
            name: I18n.getAutoGroupName(ext),
            files,
            auto: true
        }));
        this.groups.splice(groupIdx + 1, 0, ...newGroups);
        this.refresh();
    }

    /**
     * Set sort preference for a group
     * @param groupIdx Group index
     * @param criteria Sort criteria
     * @param order Sort order (ascending or descending)
     */
    setSortPreference(groupIdx: number, criteria: SortCriteria, order: 'asc' | 'desc' = 'asc') {
        const group = this.groups[groupIdx];
        if (!group) return;

        group.sortBy = criteria;
        group.sortOrder = order;
        this.refresh();
    }

    /**
     * Auto-group files by modified date
     * Only works on user-selected group
     */
    autoGroupByModifiedDate() {
        // Only allow single group selection
        if (!this.treeView || this.treeView.selection.length !== 1 || !(this.treeView.selection[0] instanceof TempFolderItem)) {
            vscode.window.showInformationMessage(I18n.getMessage('message.pleaseSelectGroup'));
            return;
        }

        const groupIdx = (this.treeView.selection[0] as TempFolderItem).groupIdx;
        const group = this.groups[groupIdx];

        if (!group || !group.files || group.files.length === 0) {
            vscode.window.showInformationMessage(I18n.getMessage('message.noFilesToGroup'));
            return;
        }

        // Group by modified date
        const dateGroups = FileGrouper.groupByModifiedDate(group.files);

        // Remove old auto groups
        this.groups = this.groups.filter((g, idx) => g.builtIn || !g.auto || idx === groupIdx);

        // Create new date-based groups
        const newGroups: TempGroup[] = [];
        const dateOrder: DateGroup[] = ['today', 'yesterday', 'thisWeek', 'lastWeek', 'thisMonth', 'older'];

        for (const dateGroup of dateOrder) {
            const files = dateGroups.get(dateGroup);
            if (files && files.length > 0) {
                newGroups.push({
                    name: FileGrouper.getDateGroupLabel(dateGroup, I18n),
                    files,
                    auto: true,
                    autoGroupType: 'modifiedDate',
                    parentGroupId: group.id
                });
            }
        }

        this.groups.splice(groupIdx + 1, 0, ...newGroups);
        this.refresh();
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: vscode.TreeItem): vscode.ProviderResult<vscode.TreeItem[]> {
        if (!element) {
            // 顯示所有群組，帶入 groupIdx
            return this.groups.map((g, idx) => new TempFolderItem(g.name, idx, g.builtIn));
        }

        // 若是群組節點，顯示檔案
        if (element instanceof TempFolderItem) {
            const group = this.groups[element.groupIdx];
            if (group && group.files && group.files.length > 0) {
                // Apply sorting before rendering
                const sortedFiles = FileSorter.sortFiles(
                    group.files,
                    group.sortBy || 'none',
                    group.sortOrder || 'asc'
                );

                return sortedFiles.map(uriStr => {
                    const uri = vscode.Uri.parse(uriStr);
                    const fileItem = new TempFileItem(uri, element.groupIdx, group.builtIn);

                    // Check if file has bookmarks (v0.2.0)
                    const bookmarks = BookmarkManager.getBookmarksForFile(group, uriStr);
                    if (bookmarks.length > 0) {
                        // Set file as expandable if it has bookmarks
                        fileItem.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
                    }

                    return fileItem;
                });
            }
        }

        // 若是檔案節點，顯示書籤 (v0.2.0)
        if (element instanceof TempFileItem) {
            const group = this.groups[element.groupIdx];
            const bookmarks = BookmarkManager.getBookmarksForFile(
                group,
                element.uri.toString()
            );

            return bookmarks.map(bookmark =>
                new BookmarkItem(bookmark, element.uri, element.groupIdx)
            );
        }

        return [];
    }
}
