import * as vscode from 'vscode';

// 群組資料結構
export interface TempGroup {
    name: string;
    files?: string[]; // 群組內檔案 URI 陣列
    readonly builtIn?: boolean; // 標記是否為內建群組
    auto?: boolean; // 標記是否為自動分群
}