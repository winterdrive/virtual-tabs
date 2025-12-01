import * as vscode from 'vscode';
import { VTBookmark, TempGroup } from './types';

/**
 * Bookmark Management Utility Class
 * Provides static methods for creating, updating, and managing bookmarks
 */
export class BookmarkManager {
    /**
     * Generate a unique ID for bookmarks
     * Using timestamp + random string to ensure uniqueness
     */
    private static generateId(): string {
        return `bm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Create a new bookmark
     * @param line Line number (0-based)
     * @param label Bookmark label (required)
     * @param character Character position (0-based, optional)
     * @param description Detailed description (optional)
     * @returns New VTBookmark instance
     */
    static createBookmark(
        line: number,
        label: string,
        character?: number,
        description?: string
    ): VTBookmark {
        return {
            id: this.generateId(),
            line,
            character,
            label,
            description,
            created: Date.now()
        };
    }

    /**
     * Update bookmark label
     * @param bookmark Original bookmark
     * @param newLabel New label
     * @returns Updated bookmark
     */
    static updateLabel(bookmark: VTBookmark, newLabel: string): VTBookmark {
        return {
            ...bookmark,
            label: newLabel,
            modified: Date.now()
        };
    }

    /**
     * Update bookmark description
     * @param bookmark Original bookmark
     * @param newDescription New description
     * @returns Updated bookmark
     */
    static updateDescription(bookmark: VTBookmark, newDescription: string | undefined): VTBookmark {
        return {
            ...bookmark,
            description: newDescription,
            modified: Date.now()
        };
    }

    /**
     * Add a bookmark to a group
     * @param group Target group
     * @param fileUri File URI string
     * @param bookmark Bookmark to add
     */
    static addBookmarkToGroup(
        group: TempGroup,
        fileUri: string,
        bookmark: VTBookmark
    ): void {
        if (!group.bookmarks) {
            group.bookmarks = {};
        }
        if (!group.bookmarks[fileUri]) {
            group.bookmarks[fileUri] = [];
        }
        group.bookmarks[fileUri].push(bookmark);
    }

    /**
     * Remove a bookmark from a group
     * @param group Target group
     * @param fileUri File URI string
     * @param bookmarkId Bookmark ID to remove
     * @returns true if removed, false if not found
     */
    static removeBookmark(
        group: TempGroup,
        fileUri: string,
        bookmarkId: string
    ): boolean {
        if (!group.bookmarks || !group.bookmarks[fileUri]) {
            return false;
        }

        const index = group.bookmarks[fileUri].findIndex(b => b.id === bookmarkId);
        if (index === -1) {
            return false;
        }

        group.bookmarks[fileUri].splice(index, 1);

        // Clean up if no bookmarks left for this file
        if (group.bookmarks[fileUri].length === 0) {
            delete group.bookmarks[fileUri];
        }

        return true;
    }

    /**
     * Get all bookmarks for a file (sorted by line number)
     * @param group Target group
     * @param fileUri File URI string
     * @returns Array of bookmarks sorted by line number
     */
    static getBookmarksForFile(
        group: TempGroup,
        fileUri: string
    ): VTBookmark[] {
        if (!group.bookmarks || !group.bookmarks[fileUri]) {
            return [];
        }

        // Sort by line number
        return [...group.bookmarks[fileUri]].sort((a, b) => a.line - b.line);
    }

    /**
     * Find a bookmark by ID within a group
     * @param group Target group
     * @param bookmarkId Bookmark ID
     * @returns Bookmark if found, null otherwise (with file URI)
     */
    static findBookmarkById(
        group: TempGroup,
        bookmarkId: string
    ): { bookmark: VTBookmark; fileUri: string } | null {
        if (!group.bookmarks) {
            return null;
        }

        for (const [fileUri, bookmarks] of Object.entries(group.bookmarks)) {
            const bookmark = bookmarks.find(b => b.id === bookmarkId);
            if (bookmark) {
                return { bookmark, fileUri };
            }
        }

        return null;
    }

    /**
     * Update a bookmark in a group
     * @param group Target group
     * @param fileUri File URI string
     * @param bookmarkId Bookmark ID
     * @param updatedBookmark Updated bookmark data
     * @returns true if updated, false if not found
     */
    static updateBookmark(
        group: TempGroup,
        fileUri: string,
        bookmarkId: string,
        updatedBookmark: VTBookmark
    ): boolean {
        if (!group.bookmarks || !group.bookmarks[fileUri]) {
            return false;
        }

        const index = group.bookmarks[fileUri].findIndex(b => b.id === bookmarkId);
        if (index === -1) {
            return false;
        }

        group.bookmarks[fileUri][index] = updatedBookmark;
        return true;
    }

    /**
     * Get total number of bookmarks in a group
     * @param group Target group
     * @returns Total bookmark count
     */
    static getTotalBookmarkCount(group: TempGroup): number {
        if (!group.bookmarks) {
            return 0;
        }

        return Object.values(group.bookmarks).reduce(
            (total, bookmarks) => total + bookmarks.length,
            0
        );
    }

    /**
     * Get number of files with bookmarks in a group
     * @param group Target group
     * @returns Number of files that have bookmarks
     */
    static getFilesWithBookmarksCount(group: TempGroup): number {
        if (!group.bookmarks) {
            return 0;
        }

        return Object.keys(group.bookmarks).length;
    }
}
