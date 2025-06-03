import * as vscode from 'vscode';

/**
 * 國際化工具類別
 * 提供多語言字串載入與格式化功能
 */
export class I18n {
    private static messages: { [key: string]: string } = {};
    private static isInitialized: boolean = false;

    /**
     * 初始化國際化模組
     * 載入對應語言的訊息檔案
     */
    public static async initialize(context: vscode.ExtensionContext): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            // 取得 VS Code 的語言設定
            const locale = vscode.env.language || 'en';
            console.log(`Loading i18n for locale: ${locale}`);
            
            // 嘗試載入對應的語言檔案
            const loaded = await this.loadLanguageFile(context, locale);
            
            if (!loaded) {
                // 如果載入失敗，嘗試載入英語作為回退
                console.log(`Failed to load ${locale}, trying fallback to English`);
                await this.loadLanguageFile(context, 'en');
            }
            
            this.isInitialized = true;
        } catch (error) {
            console.error('國際化初始化失敗:', error);
            // 使用英語作為最後的回退
            await this.loadLanguageFile(context, 'en');
            this.isInitialized = true;
        }
    }

    /**
     * 載入指定語言檔案
     * @param context 擴充功能上下文
     * @param locale 語言代碼
     * @returns 是否成功載入
     */
    private static async loadLanguageFile(context: vscode.ExtensionContext, locale: string): Promise<boolean> {
        try {
            const uri = vscode.Uri.joinPath(context.extensionUri, 'i18n', `${locale}.json`);
            const content = await vscode.workspace.fs.readFile(uri);
            const messages = JSON.parse(content.toString());
            this.messages = messages;
            console.log(`Successfully loaded ${locale}.json`);
            return true;
        } catch (error) {
            console.log(`Failed to load ${locale}.json:`, error);
            return false;
        }
    }

    /**
     * 取得本地化字串
     * @param key 訊息鍵值
     * @param args 格式化參數
     * @returns 本地化後的字串
     */
    public static getMessage(key: string, ...args: string[]): string {
        let message = this.messages[key] || key;
        
        // 格式化字串（替換 {0}, {1}, ... 等佔位符）
        for (let i = 0; i < args.length; i++) {
            message = message.replace(new RegExp(`\\{${i}\\}`, 'g'), args[i]);
        }
        
        return message;
    }

    /**
     * 便捷方法：取得群組名稱
     * @param baseName 基礎名稱
     * @param index 群組索引（用於自動命名）
     * @returns 群組名稱
     */
    public static getGroupName(baseName?: string, index?: number): string {
        if (baseName) {
            return baseName;
        }
        
        const baseText = this.getMessage('group.newGroupName');
        return index ? `${baseText} ${index}` : baseText;
    }

    /**
     * 便捷方法：取得內建群組名稱
     * @returns 內建群組名稱
     */
    public static getBuiltInGroupName(): string {
        return this.getMessage('group.builtInName');
    }

    /**
     * 便捷方法：取得自動分群前綴
     * @param extension 副檔名
     * @returns 自動分群名稱
     */
    public static getAutoGroupName(extension: string): string {
        const prefix = this.getMessage('group.autoGroupPrefix');
        return `${prefix} .${extension}`;
    }

    /**
     * 便捷方法：取得複製群組名稱
     * @param originalName 原始名稱
     * @param index 複製索引
     * @returns 複製群組名稱
     */
    public static getCopyGroupName(originalName: string, index?: number): string {
        const postfix = this.getMessage('group.copyPostfix');
        return index ? `${originalName} ${postfix} ${index}` : `${originalName} ${postfix}`;
    }

    /**
     * 檢查是否已初始化
     * @returns 是否已初始化
     */
    public static isReady(): boolean {
        return this.isInitialized;
    }

    /**
     * 重新載入語言檔案（當語言設定變更時使用）
     * @param context 擴充功能上下文
     */
    public static async reload(context: vscode.ExtensionContext): Promise<void> {
        this.isInitialized = false;
        this.messages = {};
        await this.initialize(context);
    }
}
