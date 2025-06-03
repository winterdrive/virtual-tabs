import * as vscode from 'vscode';
import { TempFoldersProvider } from './provider';
import { TempFolderItem, TempFileItem } from './treeItems';

// Drag-and-drop controller, allows files to be dragged into groups
export class TempFoldersDragAndDropController implements vscode.TreeDragAndDropController<vscode.TreeItem> {
    constructor(private provider: TempFoldersProvider) { }

    public readonly supportedTypes = ['text/uri-list'];
    public readonly dropMimeTypes = ['text/uri-list'];
    public readonly dragMimeTypes = ['text/uri-list'];

    async handleDrag(source: vscode.TreeItem[], dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Promise<void> {
        // Handle multi-file drag from the tree view
        const fileItems = source.filter((item): item is TempFileItem => item instanceof TempFileItem);

        if (fileItems.length > 0) {
            // Merge multiple file URIs into a single uri-list
            const uriList = fileItems
                .map(item => item.uri.toString())
                .join('\n');

            // Set drag data
            dataTransfer.set('text/uri-list', new vscode.DataTransferItem(uriList));
        }
    }

    async handleDrop(target: vscode.TreeItem | undefined, dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Promise<void> {
        if (!(target instanceof TempFolderItem)) return;
        const uriList = dataTransfer.get('text/uri-list');
        if (!uriList) return;
        // Fix: support both \n and \r\n, trim whitespace and control characters from each URI
        const uris = uriList.value.split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean);
        this.provider.addFilesToGroup(target.groupIdx, uris);
    }
}