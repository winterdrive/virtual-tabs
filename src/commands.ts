import * as vscode from 'vscode';
import { TempFoldersProvider } from './provider';
import { TempFileItem, TempFolderItem, BookmarkItem } from './treeItems';
import { I18n } from './i18n';
import { BookmarkManager } from './bookmarks';

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

    // ========== Bookmark Commands (v0.2.0) ==========

    // Add bookmark to group (Smart Flow)
    context.subscriptions.push(
        vscode.commands.registerCommand('virtualTabs.addBookmark', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage(I18n.getMessage('bookmark.noActiveEditor'));
                return;
            }

            const fileUri = editor.document.uri.toString();
            const position = editor.selection.active;

            // 1. Smart Labeling: Line {n} ({code snippet})
            const lineContent = editor.document.lineAt(position.line).text.trim();
            let snippet = lineContent;
            if (snippet.length > 20) {
                snippet = snippet.substring(0, 20) + '...';
            }

            let label = `Line ${position.line + 1}`;
            if (snippet) {
                label += ` (${snippet})`;
            }

            // 2. Smart Grouping
            const customGroups = provider.groups.filter(g => !g.builtIn);

            // Scenario: No custom groups available
            if (customGroups.length === 0) {
                const createOption = I18n.getMessage('command.addGroup.title'); // Reuse "Add Group" string or similar
                const selection = await vscode.window.showInformationMessage(
                    "No custom groups found. Create a new group?",
                    "Create Group"
                );

                if (selection === "Create Group") {
                    await provider.addGroup();
                    // After creating, we could try to continue, but simpler to ask user to try again
                    // or we could auto-select the new group. Let's just return for now to keep it simple.
                }
                return;
            }

            // Find groups containing this file
            const containingGroups = customGroups.filter(g => g.files?.includes(fileUri));

            let targetGroup;

            if (containingGroups.length === 1) {
                // Scenario A: File belongs to exactly one group -> Auto pick
                targetGroup = containingGroups[0];
            } else if (containingGroups.length > 1) {
                // Scenario B: File belongs to multiple groups -> Ask user
                const groupItems = containingGroups.map(g => ({
                    label: g.name,
                    group: g
                }));
                const selected = await vscode.window.showQuickPick(groupItems, {
                    placeHolder: I18n.getMessage('bookmark.selectGroup')
                });
                if (!selected) return;
                targetGroup = selected.group;
            } else {
                // Scenario C: File not in any group -> Ask user to pick any group
                const groupItems = customGroups.map(g => ({
                    label: g.name,
                    group: g
                }));
                const selected = await vscode.window.showQuickPick(groupItems, {
                    placeHolder: I18n.getMessage('bookmark.selectGroup')
                });
                if (!selected) return;
                targetGroup = selected.group;

                // Add file to group automatically
                if (!targetGroup.files) targetGroup.files = [];
                targetGroup.files.push(fileUri);
            }

            // 3. Create Bookmark (No Input Box!)
            const bookmark = BookmarkManager.createBookmark(
                position.line,
                label,
                position.character,
                '' // Description empty by default
            );

            BookmarkManager.addBookmarkToGroup(targetGroup, fileUri, bookmark);
            provider.refresh();

            // Subtle feedback
            vscode.window.setStatusBarMessage(`Bookmark added to ${targetGroup.name}`, 3000);
        })
    );

    // Jump to bookmark
    context.subscriptions.push(
        vscode.commands.registerCommand('virtualTabs.jumpToBookmark', async (item: BookmarkItem) => {
            if (!(item instanceof BookmarkItem)) {
                return;
            }

            try {
                const document = await vscode.workspace.openTextDocument(item.fileUri);
                const editor = await vscode.window.showTextDocument(document);

                const position = new vscode.Position(
                    item.bookmark.line,
                    item.bookmark.character || 0
                );

                const range = new vscode.Range(position, position);

                // Jump and scroll to center
                editor.selection = new vscode.Selection(position, position);
                editor.revealRange(range, vscode.TextEditorRevealType.InCenter);

                // Removed highlight logic based on user feedback

            } catch (error) {
                vscode.window.showErrorMessage(
                    I18n.getMessage('bookmark.jumpFailed', String(error))
                );
            }
        })
    );

    // Edit bookmark label
    context.subscriptions.push(
        vscode.commands.registerCommand('virtualTabs.editBookmarkLabel', async (item: BookmarkItem) => {
            if (!(item instanceof BookmarkItem)) {
                return;
            }

            const newLabel = await vscode.window.showInputBox({
                prompt: I18n.getMessage('bookmark.editLabel'),
                value: item.bookmark.label,
                validateInput: (value) => {
                    if (!value.trim()) {
                        return I18n.getMessage('bookmark.labelRequired');
                    }
                    return null;
                }
            });

            if (!newLabel || newLabel === item.bookmark.label) {
                return;
            }

            const group = provider.groups[item.groupIdx];
            const updatedBookmark = BookmarkManager.updateLabel(item.bookmark, newLabel);

            BookmarkManager.updateBookmark(
                group,
                item.fileUri.toString(),
                item.bookmark.id,
                updatedBookmark
            );

            provider.refresh();
            vscode.window.showInformationMessage(
                I18n.getMessage('bookmark.labelUpdated', newLabel)
            );
        })
    );

    // Edit bookmark description
    context.subscriptions.push(
        vscode.commands.registerCommand('virtualTabs.editBookmarkDescription', async (item: BookmarkItem) => {
            if (!(item instanceof BookmarkItem)) {
                return;
            }

            const newDescription = await vscode.window.showInputBox({
                prompt: I18n.getMessage('bookmark.editDescription'),
                value: item.bookmark.description || '',
                placeHolder: I18n.getMessage('bookmark.descriptionPlaceholder')
            });

            if (newDescription === undefined) {
                return; // User cancelled
            }

            const group = provider.groups[item.groupIdx];
            const updatedBookmark = BookmarkManager.updateDescription(
                item.bookmark,
                newDescription || undefined
            );

            BookmarkManager.updateBookmark(
                group,
                item.fileUri.toString(),
                item.bookmark.id,
                updatedBookmark
            );

            provider.refresh();
            vscode.window.showInformationMessage(
                I18n.getMessage('bookmark.descriptionUpdated')
            );
        })
    );

    // Remove bookmark
    context.subscriptions.push(
        vscode.commands.registerCommand('virtualTabs.removeBookmark', async (item: BookmarkItem) => {
            if (!(item instanceof BookmarkItem)) {
                return;
            }

            const group = provider.groups[item.groupIdx];
            const removed = BookmarkManager.removeBookmark(
                group,
                item.fileUri.toString(),
                item.bookmark.id
            );

            if (removed) {
                provider.refresh();
                vscode.window.setStatusBarMessage(`Bookmark removed`, 3000);
            }
        })
    );
}
