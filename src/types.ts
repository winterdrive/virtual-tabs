import * as vscode from 'vscode';

// Group data structure
export interface TempGroup {
    name: string;
    files?: string[]; // Array of file URIs in the group
    readonly builtIn?: boolean; // Mark if this is a built-in group
    auto?: boolean; // Mark if this is an auto group
}