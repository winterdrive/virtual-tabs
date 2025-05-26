import * as vscode from 'vscode';
import { TempFoldersProvider } from './provider';
import { TempFileItem, TempFolderItem } from './treeItems';

// VirtualTabs 指令註冊
export function registerCommands(context: vscode.ExtensionContext, provider: TempFoldersProvider): void {
    // 註冊新增分群指令
    context.subscriptions.push(vscode.commands.registerCommand('virtualTabs.addGroup', () => {
        provider.addGroup();
    }));

    // 註冊刪除群組指令
    context.subscriptions.push(vscode.commands.registerCommand('virtualTabs.removeGroup', (item: TempFolderItem) => {
        if (typeof item?.groupIdx === 'number') {
            provider.removeGroup(item.groupIdx);
        }
    }));

    // 註冊依副檔名自動分群指令
    context.subscriptions.push(vscode.commands.registerCommand('virtualTabs.autoGroupByExt', () => {
        provider.addAutoGroupsByExt();
    }));    

    // 一鍵開啟群組指令（僅適用於自訂群組）
    context.subscriptions.push(vscode.commands.registerCommand('virtualTabs.openAllFiles', async (item: TempFolderItem) => {
        if (typeof item?.groupIdx === 'number') {
            // 檢查是否為內建群組，若是則不執行
            const group = provider.groups[item.groupIdx];
            if (group?.builtIn) {
                vscode.window.showInformationMessage('「目前已開啟檔案」群組不需要使用此功能');
                return;
            }
            await provider.openAllFilesInGroup(item.groupIdx);
        }
    }));

    // 一鍵關閉群組指令（僅適用於自訂群組）
    context.subscriptions.push(vscode.commands.registerCommand('virtualTabs.closeAllFiles', async (item: TempFolderItem) => {
        if (typeof item?.groupIdx === 'number') {
            // 檢查是否為內建群組，若是則不執行
            const group = provider.groups[item.groupIdx];
            if (group?.builtIn) {
                vscode.window.showInformationMessage('「目前已開啟檔案」群組不需要使用此功能');
                return;
            }
            await provider.closeAllFilesInGroup(item.groupIdx);
        }
    }));

    // 群組複製
    context.subscriptions.push(vscode.commands.registerCommand('virtualTabs.duplicateGroup', (item: TempFolderItem) => {
        if (typeof item?.groupIdx !== 'number') return;
        const group = provider.groups[item.groupIdx];
        if (!group || group.builtIn) return;
        
        // 產生新名稱
        let base = group.name.replace(/\s*Copy( \d+)?$/, '');
        let idx = 1;
        let newName = `${base} Copy`;
        while (provider.groups.some(g => g.name === newName)) {
            idx++;
            newName = `${base} Copy ${idx}`;
        }
        
        // 複製群組
        provider.groups.push({
            name: newName,
            files: group.files ? [...group.files] : []
        });
        provider.refresh();
    }));

    // 群組重命名
    context.subscriptions.push(vscode.commands.registerCommand('virtualTabs.renameGroup', async (item: TempFolderItem) => {
        if (typeof item?.groupIdx !== 'number') return;
        const group = provider.groups[item.groupIdx];
        if (!group || group.builtIn) return;
        
        const newName = await vscode.window.showInputBox({
            prompt: '請輸入新的群組名稱',
            value: group.name,
            validateInput: (val) => {
                if (!val.trim()) return '名稱不可為空';
                if (provider.groups.some((g, i) => g.name === val && i !== item.groupIdx)) return '名稱重複';
                return null;
            }
        });
        
        if (newName && newName !== group.name) {
            group.name = newName;
            provider.refresh();
        }
    }));    

    // 檔案右鍵「刪除」改為從群組移除
    context.subscriptions.push(vscode.commands.registerCommand('deleteFile', (item: TempFileItem, selectedItems?: TempFileItem[]) => {
        // 處理來自瀏覽器或資源管理器的呼叫，轉發給原始命令
        if (!(item instanceof TempFileItem)) {
            vscode.commands.executeCommand('workbench.action.files.delete');
            return;
        }

        // 檢查是否有多個選取的檔案
        const allSelectedItems = provider.getSelectedFileItems();
        if (allSelectedItems.length > 1) {
            // 有多選檔案，執行多選移除
            const groupIdx = findGroupIdxForUri(provider, item.uri.toString());
            if (groupIdx === -1) return;
            provider.removeFilesFromGroup(groupIdx, allSelectedItems);
            return;
        }

        // 單選檔案的處理方式
        const groupIdx = findGroupIdxForUri(provider, item.uri.toString());
        if (groupIdx === -1) return;

        // 從群組移除此檔案
        const group = provider.groups[groupIdx];
        if (!group || !group.files) return;

        group.files = group.files.filter(uri => uri !== item.uri.toString());
        provider.refresh();
    }));

    // 處理多選檔案開啟
    context.subscriptions.push(vscode.commands.registerCommand('virtualTabs.openSelectedFiles', async () => {
        const selectedItems = provider.getSelectedFileItems();
        if (selectedItems.length === 0) return;
        
        await provider.openSelectedFiles(selectedItems);
    }));
    
    // 處理多選檔案關閉
    context.subscriptions.push(vscode.commands.registerCommand('virtualTabs.closeSelectedFiles', async () => {
        const selectedItems = provider.getSelectedFileItems();
        if (selectedItems.length === 0) return;
        
        await provider.closeSelectedFiles(selectedItems);
    }));
      
    // 處理多選檔案移除
    context.subscriptions.push(vscode.commands.registerCommand('virtualTabs.removeSelectedFilesFromGroup', (item: TempFileItem) => {
        const selectedItems = provider.getSelectedFileItems();
        if (selectedItems.length === 0) return;
        
        // 如果沒有提供特定項目或項目不是 TempFileItem，使用第一個選取的項目
        const fileItem = (item instanceof TempFileItem) ? item : selectedItems[0];
        
        // 找出當前項目所屬的群組索引
        const groupIdx = findGroupIdxForUri(provider, fileItem.uri.toString());
        if (groupIdx === -1) return;
        
        provider.removeFilesFromGroup(groupIdx, selectedItems);
    }));
    
    // 群組右鍵選單「加入選取的檔案」
    context.subscriptions.push(vscode.commands.registerCommand('virtualTabs.addSelectedFilesToGroup', (item: TempFolderItem) => {
        if (typeof item?.groupIdx !== 'number') return;
        
        const selectedItems = provider.getSelectedFileItems();
        if (selectedItems.length === 0) return;
        
        provider.addMultipleFilesToGroup(item.groupIdx, selectedItems);
    }));
    
    // 複製檔名指令
    context.subscriptions.push(vscode.commands.registerCommand('virtualTabs.copyFileName', async (item: TempFileItem) => {
        if (!(item instanceof TempFileItem)) return;
        const path = require('path');
        const fileName = path.basename(item.uri.fsPath);
        await vscode.env.clipboard.writeText(fileName);
    }));

    // 複製相對路徑指令
    context.subscriptions.push(vscode.commands.registerCommand('virtualTabs.copyRelativePath', async (item: TempFileItem) => {
        if (!(item instanceof TempFileItem)) return;
        const relativePath = vscode.workspace.asRelativePath(item.uri);
        await vscode.env.clipboard.writeText(relativePath);
    }));

    // 加入輔助函數，協助找出檔案所屬群組
    function findGroupIdxForUri(provider: TempFoldersProvider, uriString: string): number {
        for (let i = 0; i < provider.groups.length; i++) {
            const group = provider.groups[i];
            if (group.files && group.files.includes(uriString)) {
                return i;
            }
        }
        return -1;
    }

    // 內建群組複製
    context.subscriptions.push(vscode.commands.registerCommand('virtualTabs.duplicateBuiltInGroup', (item: TempFolderItem) => {
        if (typeof item?.groupIdx !== 'number') return;
        const group = provider.groups[item.groupIdx];
        if (!group || !group.builtIn) return;
        
        // 產生新名稱
        let base = '目前已開啟檔案';
        let idx = 1;
        let newName = `${base} Copy`;
        while (provider.groups.some(g => g.name === newName)) {
            idx++;
            newName = `${base} Copy ${idx}`;
        }
        
        provider.groups.push({
            name: newName,
            files: group.files ? [...group.files] : []
        });
        provider.refresh();
    }));

    // 內建群組重新整理
    context.subscriptions.push(vscode.commands.registerCommand('virtualTabs.refreshBuiltInGroup', (item: TempFolderItem) => {
        if (typeof item?.groupIdx !== 'number') return;
        const group = provider.groups[item.groupIdx];
        if (!group || !group.builtIn) return;
        provider.refresh();
    }));
}
