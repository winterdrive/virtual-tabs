import * as vscode from 'vscode';
import { TempFoldersProvider } from './provider';
import { TempFileItem, TempFolderItem } from './treeItems';
import { I18n } from './i18n';

// VirtualTabs command registration
export function registerCommands(context: vscode.ExtensionContext, provider: TempFoldersProvider): void {
    // Register add group command
    context.subscriptions.push(vscode.commands.registerCommand('virtualTabs.addGroup', () => {
        provider.addGroup();
    }));

    // Register remove group command
    context.subscriptions.push(vscode.commands.registerCommand('virtualTabs.removeGroup', (item: TempFolderItem) => {
        if (typeof item?.groupIdx === 'number') {
            provider.removeGroup(item.groupIdx);
        }
    }));

    // Register auto group by extension command
    context.subscriptions.push(vscode.commands.registerCommand('virtualTabs.autoGroupByExt', () => {
        provider.addAutoGroupsByExt();
    }));

    // One-click open group command (only for custom groups)
    context.subscriptions.push(vscode.commands.registerCommand('virtualTabs.openAllFiles', async (item: TempFolderItem) => {
        if (typeof item?.groupIdx === 'number') {
            // Check if it is a built-in group, if so, do not execute
            const group = provider.groups[item.groupIdx];
            if (group?.builtIn) {
                vscode.window.showInformationMessage(I18n.getMessage('message.builtInGroupNotSupported'));
                return;
            }
            await provider.openAllFilesInGroup(item.groupIdx);
        }
    }));

    // One-click close group command (only for custom groups)
    context.subscriptions.push(vscode.commands.registerCommand('virtualTabs.closeAllFiles', async (item: TempFolderItem) => {
        if (typeof item?.groupIdx === 'number') {
            // Check if it is a built-in group, if so, do not execute
            const group = provider.groups[item.groupIdx];
            if (group?.builtIn) {
                vscode.window.showInformationMessage(I18n.getMessage('message.builtInGroupNotSupported'));
                return;
            }
            await provider.closeAllFilesInGroup(item.groupIdx);
        }
    }));

    // Group duplication
    context.subscriptions.push(vscode.commands.registerCommand('virtualTabs.duplicateGroup', (item: TempFolderItem) => {
        if (typeof item?.groupIdx !== 'number') return;
        const group = provider.groups[item.groupIdx];
        if (!group || group.builtIn) return;

        // Generate new name
        let base = group.name.replace(/\s*Copy( \d+)?$/, '');
        let idx = 1;
        let newName = I18n.getCopyGroupName(base);
        while (provider.groups.some(g => g.name === newName)) {
            idx++;
            newName = I18n.getCopyGroupName(base, idx);
        }

        // Duplicate group
        provider.groups.push({
            name: newName,
            files: group.files ? [...group.files] : []
        });
        provider.refresh();
    }));

    // Group rename
    context.subscriptions.push(vscode.commands.registerCommand('virtualTabs.renameGroup', async (item: TempFolderItem) => {
        if (typeof item?.groupIdx !== 'number') return;
        const group = provider.groups[item.groupIdx];
        if (!group || group.builtIn) return;

        const newName = await vscode.window.showInputBox({
            prompt: I18n.getMessage('input.groupNamePrompt'),
            value: group.name,
            validateInput: (val) => {
                if (!val.trim()) return I18n.getMessage('input.groupNameError.empty');
                if (provider.groups.some((g, i) => g.name === val && i !== item.groupIdx)) return I18n.getMessage('input.groupNameError.duplicate');
                return null;
            }
        });

        if (newName && newName !== group.name) {
            group.name = newName;
            provider.refresh();
        }
    }));        // File right-click "delete" is changed to remove from group
    context.subscriptions.push(vscode.commands.registerCommand('deleteFile', (item: TempFileItem, selectedItems?: TempFileItem[]) => {
        // Handle calls from browser or file explorer, forward to original command
        if (!(item instanceof TempFileItem)) {
            vscode.commands.executeCommand('workbench.action.files.delete');
            return;
        }

        // Check if multiple files are selected
        const allSelectedItems = provider.getSelectedFileItems();
        if (allSelectedItems.length > 1) {
            // Multiple files selected, execute multi-select removal
            provider.removeFilesFromGroup(item.groupIdx, allSelectedItems);
            return;
        }

        // Single file handling
        const group = provider.groups[item.groupIdx];
        if (!group || !group.files) return;

        group.files = group.files.filter(uri => uri !== item.uri.toString());
        provider.refresh();
    }));

    // Handle opening multiple selected files
    context.subscriptions.push(vscode.commands.registerCommand('virtualTabs.openSelectedFiles', async () => {
        const selectedItems = provider.getSelectedFileItems();
        if (selectedItems.length === 0) return;

        await provider.openSelectedFiles(selectedItems);
    }));

    // Handle closing multiple selected files
    context.subscriptions.push(vscode.commands.registerCommand('virtualTabs.closeSelectedFiles', async () => {
        const selectedItems = provider.getSelectedFileItems();
        if (selectedItems.length === 0) return;

        await provider.closeSelectedFiles(selectedItems);
    }));
    // Handle removing multiple selected files from group
    context.subscriptions.push(vscode.commands.registerCommand('virtualTabs.removeSelectedFilesFromGroup', (item: TempFileItem) => {
        const selectedItems = provider.getSelectedFileItems();
        if (selectedItems.length === 0) return;

        // If no specific item is provided or item is not TempFileItem, use the first selected item
        const fileItem = (item instanceof TempFileItem) ? item : selectedItems[0];

        // Use the group index of the file item directly
        provider.removeFilesFromGroup(fileItem.groupIdx, selectedItems);
    }));

    // Group context menu "Add selected files to group"
    context.subscriptions.push(vscode.commands.registerCommand('virtualTabs.addSelectedFilesToGroup', (item: TempFolderItem) => {
        if (typeof item?.groupIdx !== 'number') return;

        const selectedItems = provider.getSelectedFileItems();
        if (selectedItems.length === 0) return;

        provider.addMultipleFilesToGroup(item.groupIdx, selectedItems);
    }));

    // Copy file name command
    context.subscriptions.push(vscode.commands.registerCommand('virtualTabs.copyFileName', async (item: TempFileItem) => {
        if (!(item instanceof TempFileItem)) return;
        const path = require('path');
        const fileName = path.basename(item.uri.fsPath);
        await vscode.env.clipboard.writeText(fileName);
    }));    // Copy relative path command
    context.subscriptions.push(vscode.commands.registerCommand('virtualTabs.copyRelativePath', async (item: TempFileItem) => {
        if (!(item instanceof TempFileItem)) return;
        const relativePath = vscode.workspace.asRelativePath(item.uri);
        await vscode.env.clipboard.writeText(relativePath);
    }));

    // Duplicate built-in group
    context.subscriptions.push(vscode.commands.registerCommand('virtualTabs.duplicateBuiltInGroup', (item: TempFolderItem) => {
        if (typeof item?.groupIdx !== 'number') return;
        const group = provider.groups[item.groupIdx];
        if (!group || !group.builtIn) return;

        // Generate new name
        let base = I18n.getBuiltInGroupName();
        let idx = 1;
        let newName = I18n.getCopyGroupName(base);
        while (provider.groups.some(g => g.name === newName)) {
            idx++;
            newName = I18n.getCopyGroupName(base, idx);
        }

        provider.groups.push({
            name: newName,
            files: group.files ? [...group.files] : []
        });
        provider.refresh();
    }));

    // Refresh built-in group
    context.subscriptions.push(vscode.commands.registerCommand('virtualTabs.refreshBuiltInGroup', (item: TempFolderItem) => {
        if (typeof item?.groupIdx !== 'number') return;
        const group = provider.groups[item.groupIdx];
        if (!group || !group.builtIn) return;
        provider.refresh();
    }));    // Remove single file from group
    context.subscriptions.push(vscode.commands.registerCommand('virtualTabs.removeFileFromGroup', (item: TempFileItem) => {
        if (!(item instanceof TempFileItem)) return;

        // Directly use the group index of the file item, no need to search again
        const groupIdx = item.groupIdx;
        const group = provider.groups[groupIdx];

        if (!group || !group.files) {
            vscode.window.showErrorMessage(I18n.getMessage('message.groupNotFound'));
            return;
        }

        // Filter out the file to be removed
        const originalLength = group.files.length;
        group.files = group.files.filter(uri => uri !== item.uri.toString());

        // Check if the file is really removed
        if (group.files.length === originalLength) {
            vscode.window.showWarningMessage(I18n.getMessage('message.fileNotInGroup'));
            return;
        }

        // Refresh TreeView
        provider.refresh();

        // Show removal success message
        vscode.window.showInformationMessage(I18n.getMessage('message.fileRemovedFromGroup', group.name));
    }));

    // Sort by name command
    context.subscriptions.push(vscode.commands.registerCommand('virtualTabs.sortByName', (item: TempFolderItem) => {
        if (typeof item?.groupIdx === 'number') {
            provider.setSortPreference(item.groupIdx, 'name', 'asc');
        }
    }));

    // Sort by path command
    context.subscriptions.push(vscode.commands.registerCommand('virtualTabs.sortByPath', (item: TempFolderItem) => {
        if (typeof item?.groupIdx === 'number') {
            provider.setSortPreference(item.groupIdx, 'path', 'asc');
        }
    }));

    // Sort by extension command
    context.subscriptions.push(vscode.commands.registerCommand('virtualTabs.sortByExtension', (item: TempFolderItem) => {
        if (typeof item?.groupIdx === 'number') {
            provider.setSortPreference(item.groupIdx, 'extension', 'asc');
        }
    }));

    // Sort by modified time command
    context.subscriptions.push(vscode.commands.registerCommand('virtualTabs.sortByModified', (item: TempFolderItem) => {
        if (typeof item?.groupIdx === 'number') {
            provider.setSortPreference(item.groupIdx, 'modified', 'asc');
        }
    }));

    // Toggle sort order command
    context.subscriptions.push(vscode.commands.registerCommand('virtualTabs.toggleSortOrder', (item: TempFolderItem) => {
        if (typeof item?.groupIdx === 'number') {
            const group = provider.groups[item.groupIdx];
            if (group && group.sortBy && group.sortBy !== 'none') {
                const newOrder = group.sortOrder === 'asc' ? 'desc' : 'asc';
                provider.setSortPreference(item.groupIdx, group.sortBy, newOrder);
            }
        }
    }));

    // Clear sorting command
    context.subscriptions.push(vscode.commands.registerCommand('virtualTabs.clearSort', (item: TempFolderItem) => {
        if (typeof item?.groupIdx === 'number') {
            provider.setSortPreference(item.groupIdx, 'none', 'asc');
        }
    }));

    // Auto group by modified date command
    context.subscriptions.push(vscode.commands.registerCommand('virtualTabs.autoGroupByModifiedDate', () => {
        provider.autoGroupByModifiedDate();
    }));
}
