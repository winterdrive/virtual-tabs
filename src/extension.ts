import * as vscode from 'vscode';
import { TempFoldersProvider } from './provider';
import { TempFoldersDragAndDropController } from './dragAndDrop';
import { registerCommands } from './commands';
import { I18n } from './i18n';

/**
 * Activate the extension
 * @param context Extension context
 */
export async function activate(context: vscode.ExtensionContext) {
    // Initialize i18n
    await I18n.initialize(context);
    
    // Listen for language configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration('locale')) {
                console.log('Language configuration changed, reloading i18n...');
                await I18n.reload(context);
            }
        })
    );
    
    // Create Provider and DragAndDrop controller
    const provider = new TempFoldersProvider(context);
    const dragAndDropController = new TempFoldersDragAndDropController(provider);

    // Create tree view, enable multi-select
    const treeView = vscode.window.createTreeView('virtualTabsView', {
        treeDataProvider: provider,
        dragAndDropController,
        canSelectMany: true
    });
    context.subscriptions.push(treeView);
    
    // Pass the tree view to the provider for selection management
    provider.setTreeView(treeView);

    // Refresh the view when it becomes visible
    treeView.onDidChangeVisibility(e => {
        if (e.visible) {
            provider.refresh();
        }
    });

    // Register all commands
    registerCommands(context, provider);
}

/**
 * Deactivate the extension
 */
export function deactivate() { }
