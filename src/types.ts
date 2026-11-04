// --- 型定義 ---
export type CleanupFn = () => void;
export interface Disposable {
    dispose: () => void;
}
export type AnimationResult = CleanupFn | Disposable | void;

export interface DictionaryEntry {
    num?: number | string;
    word?: string;
    partOfSpeech?: string;
    [key: string]: any;
}

export interface DictionaryData {
    words?: DictionaryEntry[];
    idioms?: DictionaryEntry[];
}

export interface SuggestionItem {
    word: string;
    normalizedWord: string;
    searchValue: string;
    numStr?: string;
}

export interface RecentSearchItem {
    searchValue: string;
    label: string;
}

export interface AudioCacheEntry {
    audioUrl: string;
    ipaText: string;
}

// --- クリーンアップ関数管理 ---
export const activeCleanups = new Set<CleanupFn>();

export function registerCleanup(result: AnimationResult): void {
    if (!result) return;
    if (typeof result === "function") {
        activeCleanups.add(result);
    } else if (typeof result === "object" && typeof result.dispose === "function") {
        activeCleanups.add(() => result.dispose());
    }
}