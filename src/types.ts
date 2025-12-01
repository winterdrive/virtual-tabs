import * as vscode from 'vscode';

// Sort criteria for files in a group
export type SortCriteria =
    | 'none'        // Insertion order (default)
    | 'name'        // Filename A-Z
    | 'path'        // Full path
    | 'extension'   // File extension
    | 'modified';   // Last modified time

// Group by criteria
export type GroupByCriteria =
    | 'none'
    | 'extension'
    | 'modifiedDate';

// Date group categories
export type DateGroup =
    | 'today'
    | 'yesterday'
    | 'thisWeek'
    | 'lastWeek'
    | 'thisMonth'
    | 'older';

// Group data structure
export interface TempGroup {
    id?: string;                        // Unique identifier (for future use)
    name: string;
    files?: string[];                   // Array of file URIs in the group
    readonly builtIn?: boolean;         // Mark if this is a built-in group
    auto?: boolean;                     // Mark if this is an auto group

    // Display preferences (v0.1.0)
    sortBy?: SortCriteria;              // Sort preference
    sortOrder?: 'asc' | 'desc';         // Sort direction
    groupBy?: GroupByCriteria;          // Grouping preference
    autoGroupType?: 'extension' | 'modifiedDate';  // Type of auto-grouping
    parentGroupId?: string;             // Parent group ID (for nested groups)

    // Reserved for future use
    metadata?: Record<string, any>;     // For bookmarks, colors, etc.
}