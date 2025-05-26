import * as vscode from 'vscode';
import { TempFoldersProvider } from './provider';
import { TempFolderItem, TempFileItem } from './treeItems';

// 拖曳控制器，讓檔案能拖入群組
export class TempFoldersDragAndDropController implements vscode.TreeDragAndDropController<vscode.TreeItem> {
    constructor(private provider: TempFoldersProvider) { }

    public readonly supportedTypes = ['text/uri-list'];
    public readonly dropMimeTypes = ['text/uri-list'];
    public readonly dragMimeTypes = ['text/uri-list'];

    async handleDrag(source: vscode.TreeItem[], dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Promise<void> {
        // 處理來自樹狀視圖的多選檔案拖曳
        const fileItems = source.filter((item): item is TempFileItem => item instanceof TempFileItem);

        if (fileItems.length > 0) {
            // 將多個檔案 URI 合併為一個 uri-list
            const uriList = fileItems
                .map(item => item.uri.toString())
                .join('\n');

            // 設置拖曳資料
            dataTransfer.set('text/uri-list', new vscode.DataTransferItem(uriList));
        }
    }

    async handleDrop(target: vscode.TreeItem | undefined, dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Promise<void> {
        if (!(target instanceof TempFolderItem)) return;
        const uriList = dataTransfer.get('text/uri-list');
        if (!uriList) return;
        // 修正：同時支援 \n、\r\n 並去除每個 URI 的首尾空白與控制字元
        const uris = uriList.value.split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean);
        this.provider.addFilesToGroup(target.groupIdx, uris);
    }
}