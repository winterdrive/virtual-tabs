import * as vscode from 'vscode';
import { TempFoldersProvider } from './provider';
import { TempFoldersDragAndDropController } from './dragAndDrop';
import { registerCommands } from './commands';
import { I18n } from './i18n';

/**
 * 啟動擴充套件
 * @param context 擴充套件上下文
 */
export async function activate(context: vscode.ExtensionContext) {
    // 初始化國際化
    await I18n.initialize(context);
    
    // 監聽語言設定變更
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration('locale')) {
                console.log('Language configuration changed, reloading i18n...');
                await I18n.reload(context);
            }
        })
    );
    
    // 建立 Provider 與 DragAndDrop 控制器
    const provider = new TempFoldersProvider(context);
    const dragAndDropController = new TempFoldersDragAndDropController(provider);

    // 建立樹狀視圖，啟用多選功能
    const treeView = vscode.window.createTreeView('virtualTabsView', {
        treeDataProvider: provider,
        dragAndDropController,
        canSelectMany: true
    });
    context.subscriptions.push(treeView);
    
    // 將樹狀視圖傳給 provider，以便處理選取功能
    provider.setTreeView(treeView);

    // 註冊所有指令
    registerCommands(context, provider);
}

/**
 * 停用擴充套件
 */
export function deactivate() { }
