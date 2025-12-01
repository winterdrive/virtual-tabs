import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { SortCriteria } from './types';

/**
 * File sorter utility class
 * Provides sorting functionality for file URIs
 */
export class FileSorter {
    /**
     * Sort file URIs based on criteria
     * @param uris Array of file URI strings
     * @param criteria Sort criteria
     * @param order Sort order (ascending or descending)
     * @returns Sorted array of file URI strings
     */
    static sortFiles(
        uris: string[],
        criteria: SortCriteria,
        order: 'asc' | 'desc' = 'asc'
    ): string[] {
        if (criteria === 'none') {
            return uris; // Keep original order
        }

        const sorted = [...uris];

        sorted.sort((a, b) => {
            let comparison = 0;

            switch (criteria) {
                case 'name':
                    comparison = this.compareByName(a, b);
                    break;
                case 'path':
                    comparison = this.compareByPath(a, b);
                    break;
                case 'extension':
                    comparison = this.compareByExtension(a, b);
                    break;
                case 'modified':
                    comparison = this.compareByModified(a, b);
                    break;
                default:
                    return 0;
            }

            return order === 'asc' ? comparison : -comparison;
        });

        return sorted;
    }

    /**
     * Compare files by name (natural sorting with numeric support)
     */
    private static compareByName(a: string, b: string): number {
        try {
            const nameA = path.basename(vscode.Uri.parse(a).fsPath).toLowerCase();
            const nameB = path.basename(vscode.Uri.parse(b).fsPath).toLowerCase();
            return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
        } catch (e) {
            console.error('Error comparing by name:', e);
            return 0;
        }
    }

    /**
     * Compare files by full path
     */
    private static compareByPath(a: string, b: string): number {
        try {
            const pathA = vscode.Uri.parse(a).fsPath.toLowerCase();
            const pathB = vscode.Uri.parse(b).fsPath.toLowerCase();
            return pathA.localeCompare(pathB, undefined, { numeric: true, sensitivity: 'base' });
        } catch (e) {
            console.error('Error comparing by path:', e);
            return 0;
        }
    }

    /**
     * Compare files by extension, then by name if extensions are the same
     */
    private static compareByExtension(a: string, b: string): number {
        try {
            const extA = path.extname(vscode.Uri.parse(a).fsPath).toLowerCase();
            const extB = path.extname(vscode.Uri.parse(b).fsPath).toLowerCase();

            if (extA === extB) {
                // If same extension, sort by name
                return this.compareByName(a, b);
            }

            // Files without extension should come first
            if (!extA) return -1;
            if (!extB) return 1;

            return extA.localeCompare(extB);
        } catch (e) {
            console.error('Error comparing by extension:', e);
            return 0;
        }
    }

    /**
     * Compare files by last modified time
     */
    private static compareByModified(a: string, b: string): number {
        try {
            const statA = fs.statSync(vscode.Uri.parse(a).fsPath);
            const statB = fs.statSync(vscode.Uri.parse(b).fsPath);
            return statA.mtime.getTime() - statB.mtime.getTime();
        } catch (e) {
            // If file doesn't exist or error occurs, fallback to name sorting
            console.warn('Cannot access file stats, falling back to name sort:', e);
            return this.compareByName(a, b);
        }
    }
}
