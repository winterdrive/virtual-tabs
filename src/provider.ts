import * as vscode from 'vscode';
import { TempGroup } from './types';
import { TempFileItem, TempFolderItem } from './treeItems';

// TreeDataProvider 實作
export class TempFoldersProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null> = new vscode.EventEmitter();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    // 記憶體內部群組陣列
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

    // 儲存 TreeView 參考，以便管理多選功能
    setTreeView(treeView: vscode.TreeView<vscode.TreeItem>): void {
        this.treeView = treeView;
    }

    // 取得目前已選取的檔案項目
    getSelectedFileItems(): TempFileItem[] {
        if (!this.treeView) return [];

        // 確保 selection 是一個陣列
        const selection = this.treeView.selection || [];

        // 過濾出所有 TempFileItem 型別的項目
        const fileItems = selection.filter((item): item is TempFileItem => item instanceof TempFileItem);

        // 記錄一下取得的選取項目數量，以便除錯
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
                this.groups = saved;
            }
        }
    }

    private initBuiltInGroup() {
        // 取得所有已開啟的編輯器檔案
        const openUris = vscode.window.tabGroups.all
            .flatMap(g => g.tabs)
            .map(tab => (tab.input as any)?.uri as vscode.Uri)
            .filter((uri): uri is vscode.Uri => !!uri)
            .map(uri => uri.toString());
        this.groups.unshift({ name: '目前已開啟檔案', files: openUris, builtIn: true });
    }

    refresh(): void {
        // 重新同步 built-in 群組內容
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
        // 自動產生名稱 New Group 1, 2, ...
        let idx = 1;
        let name = `New Group ${idx}`;
        while (this.groups.some(g => g.name === name)) {
            idx++;
            name = `New Group ${idx}`;
        }
        this.groups.push({ name, files: [] });
        this.refresh();
    }

    removeGroup(idx: number) {
        // 不能刪除 built-in 群組
        if (this.groups[idx]?.builtIn) return;
        this.groups.splice(idx, 1);
        this.refresh();
    }

    addFilesToGroup(groupIdx: number, uris: string[]) {
        const group = this.groups[groupIdx];
        if (!group) return;
        if (!group.files) group.files = [];
        // 避免重複
        for (const uri of uris) {
            if (!group.files.includes(uri)) {
                group.files.push(uri);
            }
        }
        this.refresh();
    }

    // 一鍵開啟群組內所有檔案（僅適用於自訂群組）
    async openAllFilesInGroup(idx: number) {
        const group = this.groups[idx];
        // 檢查是否為內建群組，若是則不執行
        if (!group || group.builtIn) return;

        const files = group.files || [];
        if (files.length > 0) {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `正在開啟群組「${group.name}」中的檔案`,
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
                            message: `(${openedCount}/${total})`
                        });
                        // 給系統一點時間處理
                        await new Promise(resolve => setTimeout(resolve, 100));
                    } catch (e) {
                        console.error(`無法開啟檔案 ${uriStr}`, e);
                    }
                }
            });
        } else {
            vscode.window.showInformationMessage(`群組「${group.name}」中沒有檔案可開啟`);
        }
    }

    // 一鍵關閉群組內所有檔案（僅適用於自訂群組）
    async closeAllFilesInGroup(idx: number) {
        const group = this.groups[idx];
        // 檢查是否為內建群組，若是則不執行
        if (!group || group.builtIn) return;

        const files = group.files || [];
        if (files.length > 0) {
            // 顯示進度通知
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `正在關閉群組「${group.name}」中的檔案`,
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
                        console.error(`無法解析 URI: ${uriStr}`, e);
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
                            message: `(${closedCount}/${tabsToClose.length})`
                        });
                        // 給系統一點時間處理
                        await new Promise(resolve => setTimeout(resolve, 50));
                    } catch (e) {
                        console.error(`無法關閉標籤頁:`, e);
                    }
                }

            });
        } else {
            vscode.window.showInformationMessage(`群組「${group.name}」中沒有檔案可關閉`);
        }
    }

    // 開啟多個選取的檔案
    async openSelectedFiles(fileItems: TempFileItem[]) {
        if (fileItems.length === 0) return;

        // 顯示進度通知
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `正在開啟選取的檔案`,
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
                        message: `(${openedCount}/${total})`
                    });
                    // 給系統一點時間處理
                    await new Promise(resolve => setTimeout(resolve, 100));
                } catch (e) {
                    console.error(`無法開啟檔案: ${item.uri.toString()}`, e);
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
            title: `正在關閉選取的檔案`,
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
                        message: `(${closedCount}/${tabsToClose.length})`
                    });
                    // 給系統一點時間處理
                    await new Promise(resolve => setTimeout(resolve, 50));
                } catch (e) {
                    console.error(`無法關閉標籤頁:`, e);
                }
            }

        });
    }

    // 從群組中移除多個選取的檔案
    removeFilesFromGroup(groupIdx: number, fileItems: TempFileItem[]) {
        const group = this.groups[groupIdx];
        if (!group || !group.files || fileItems.length === 0) return;

        // 先確認所有選取的檔案都在指定群組中
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
     * 只針對使用者選取的群組內檔案進行副檔名自動分群。
     * 若未選取群組則顯示提示，不再 fallback 為所有已開啟檔案。
     */
    addAutoGroupsByExt() {
        // 僅允許單一群組選取
        if (!this.treeView || this.treeView.selection.length !== 1 || !(this.treeView.selection[0] instanceof TempFolderItem)) {
            vscode.window.showInformationMessage('請先選取一個群組再進行自動分群。');
            return;
        }
        const groupIdx = (this.treeView.selection[0] as TempFolderItem).groupIdx;
        const group = this.groups[groupIdx];
        if (!group || !group.files || group.files.length === 0) {
            vscode.window.showInformationMessage('選取的群組沒有檔案可分群。');
            return;
        }
        // 依副檔名分群
        const extMap: Record<string, string[]> = {};
        for (const uriStr of group.files) {
            try {
                const uri = vscode.Uri.parse(uriStr);
                const ext = uri.fsPath.split('.').pop()?.toLowerCase() || 'other';
                if (!extMap[ext]) extMap[ext] = [];
                extMap[ext].push(uriStr);
            } catch { }
        }
        // 移除舊的自動分群
        this.groups = this.groups.filter((g, idx) => g.builtIn || !g.auto || idx === groupIdx);
        // 在原群組位置插入自動分群
        const newGroups = Object.entries(extMap).map(([ext, files]) => ({
            name: `[自動] .${ext}`,
            files,
            auto: true
        }));
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
        }        // 若是群組節點，顯示檔案
        if (element instanceof TempFolderItem) {
            const group = this.groups[element.groupIdx];
            if (group && group.files && group.files.length > 0) {
                return group.files.map(uriStr => {
                    const uri = vscode.Uri.parse(uriStr);
                    return new TempFileItem(uri, element.groupIdx, group.builtIn);
                });
            }
        }
        return [];
    }
}
