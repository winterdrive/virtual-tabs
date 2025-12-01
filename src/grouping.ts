import * as vscode from 'vscode';
import * as fs from 'fs';
import { DateGroup } from './types';

/**
 * File grouper utility class
 * Provides grouping functionality for files
 */
export class FileGrouper {
    /**
     * Group files by modification date
     * Uses project-relative dates (newest file as reference)
     * @param uris Array of file URI strings
     * @returns Map of date group to file URIs
     */
    static groupByModifiedDate(uris: string[]): Map<DateGroup, string[]> {
        const groups = new Map<DateGroup, string[]>();

        // Find newest file in the set
        const newestTime = this.getNewestFileTime(uris);
        const referenceDate = new Date(newestTime);

        for (const uri of uris) {
            const group = this.getDateGroup(uri, referenceDate);
            if (!groups.has(group)) {
                groups.set(group, []);
            }
            groups.get(group)!.push(uri);
        }

        return groups;
    }

    /**
     * Get the modification time of the newest file
     */
    private static getNewestFileTime(uris: string[]): number {
        let newest = 0;
        for (const uri of uris) {
            try {
                const stat = fs.statSync(vscode.Uri.parse(uri).fsPath);
                if (stat.mtime.getTime() > newest) {
                    newest = stat.mtime.getTime();
                }
            } catch (e) {
                // Skip files that can't be accessed
                console.warn('Cannot access file for date grouping:', uri, e);
            }
        }
        return newest || Date.now();
    }

    /**
     * Determine which date group a file belongs to
     * @param uri File URI string
     * @param referenceDate Reference date (usually newest file's date)
     * @returns Date group category
     */
    private static getDateGroup(uri: string, referenceDate: Date): DateGroup {
        try {
            const stat = fs.statSync(vscode.Uri.parse(uri).fsPath);
            const fileDate = new Date(stat.mtime);

            const daysDiff = this.getDaysDifference(fileDate, referenceDate);

            if (daysDiff === 0) return 'today';
            if (daysDiff === 1) return 'yesterday';
            if (daysDiff <= 7) return 'thisWeek';
            if (daysDiff <= 14) return 'lastWeek';
            if (daysDiff <= 30) return 'thisMonth';
            return 'older';
        } catch (e) {
            console.warn('Cannot access file for date grouping:', uri, e);
            return 'older';
        }
    }

    /**
     * Calculate the difference in days between two dates
     */
    private static getDaysDifference(date1: Date, date2: Date): number {
        const oneDay = 24 * 60 * 60 * 1000; // milliseconds in a day
        const date1Start = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
        const date2Start = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
        const diffTime = Math.abs(date2Start.getTime() - date1Start.getTime());
        return Math.floor(diffTime / oneDay);
    }

    /**
     * Get localized label for date group
     * @param group Date group category
     * @param i18n I18n instance with getMessage method
     * @returns Localized label
     */
    static getDateGroupLabel(group: DateGroup, i18n: any): string {
        const labels: Record<DateGroup, string> = {
            'today': i18n.getMessage('dateGroup.today'),
            'yesterday': i18n.getMessage('dateGroup.yesterday'),
            'thisWeek': i18n.getMessage('dateGroup.thisWeek'),
            'lastWeek': i18n.getMessage('dateGroup.lastWeek'),
            'thisMonth': i18n.getMessage('dateGroup.thisMonth'),
            'older': i18n.getMessage('dateGroup.older')
        };
        return labels[group];
    }
}
