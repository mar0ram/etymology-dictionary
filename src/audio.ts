import { AudioCacheEntry } from "./types.js";
import { renderInteractiveIpaHtml, bindInteractiveIpaEvents } from "./ipa.js";


// --- 音声キャッシュ管理（localStorage連携・最大500件） ---
const AUDIO_CACHE_STORAGE_KEY = "mw_audio_cache_v1";
let initialAudioCacheEntries: [string, AudioCacheEntry][] = [];
try {
    initialAudioCacheEntries = JSON.parse(localStorage.getItem(AUDIO_CACHE_STORAGE_KEY) || "[]");
} catch {
    initialAudioCacheEntries = [];
}
const audioCache = new Map<string, AudioCacheEntry>(initialAudioCacheEntries);

function saveAudioCache(key: string, value: AudioCacheEntry): void {
    audioCache.set(key, value);
    try {
        if (audioCache.size > 500) {
            const oldestKey = audioCache.keys().next().value;
            if (oldestKey !== undefined) {
                audioCache.delete(oldestKey);
            }
        }
        localStorage.setItem(AUDIO_CACHE_STORAGE_KEY, JSON.stringify([...audioCache]));
    } catch {
        // ストレージ容量上限などの場合はメモリキャッシュのみ継続利用
    }
}

// 音声再生用の共有Audioインスタンス
const sharedAudioPlayer = new Audio();
sharedAudioPlayer.preload = "none";
let activePlayingBtn: HTMLElement | null = null;

export function stopSharedAudio(): void {
    sharedAudioPlayer.pause();
    if (activePlayingBtn) {
        activePlayingBtn.dataset.playing = "false";
        activePlayingBtn.style.opacity = "1";
        activePlayingBtn = null;
    }
}

// --- MWの独自表記を日本人向けの読みやすいIPAに変換 ---
export function safeConvertMwToIpa(mwStr: string): string {
    if (!mwStr) return "";
    const ipa = mwStr
        .replace(/\([ˈˌ]\)/g, "")
        .replace(/\*/g, "ˈ")
        .replace(/\\u02cc/g, "ˌ")
        .replace(/au̇|aù/g, "A_U")
        .replace(/ā/g, "E_I")
        .replace(/ī/g, "A_I")
        .replace(/ä/g, "A_H")
        .replace(/ȧ/g, "A_H")
        .replace(/ȯi/g, "ɔɪ")
        .replace(/yü/g, "J_U_LONG")
        .replace(/yu̇/g, "J_U_SHORT")
        .replace(/t͟h/g, "ð")
        .replace(/th/g, "θ")
        .replace(/sh/g, "ʃ")
        .replace(/zh/g, "ʒ")
        .replace(/ch/g, "tʃ")
        .replace(/j/g, "dʒ")
        .replace(/y/g, "j")
        .replace(/a/g, "æ")
        .replace(/A_U/g, "aʊ")
        .replace(/E_I/g, "eɪ")
        .replace(/A_I/g, "aɪ")
        .replace(/A_H/g, "ɑ")
        .replace(/J_U_LONG/g, "juː")
        .replace(/J_U_SHORT/g, "jʊ")
        .replace(/ē/g, "iː")
        .replace(/ō/g, "oʊ")
        .replace(/ü|ū/g, "uː")
        .replace(/u̇/g, "ʊ")
        .replace(/ȯ/g, "ɔ")
        .replace(/ə̆|ᵊ/g, "ə")
        .replace(/[-_]/g, "")
        .replace(/\s*([ˈˌ])/g, " $1");

    return `/${ipa}/`;
}

// --- Merriam-Webster API 音声取得（AbortSignal対応・ポーリング廃止） ---
export async function fetchAndSetAudio(
    word: string,
    num: string,
    partOfSpeech = "",
    signal?: AbortSignal
): Promise<void> {
    try {
        if (signal?.aborted) return;

        const cacheKey = `${String(word).toLowerCase()}__${String(partOfSpeech).trim().toLowerCase()}`;
        let audioUrl = "";
        let ipaText = "";

        if (audioCache.has(cacheKey)) {
            const cached = audioCache.get(cacheKey)!;
            audioUrl = cached.audioUrl;
            ipaText = cached.ipaText;
        } else {
            const k = "74a8b9a7-6973-4b74-b19d-1425e02f3912";
            const apiUrl = `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(word)}?key=${k}`;

            const response = await fetch(apiUrl, { signal });
            if (!response.ok || signal?.aborted) return;

            const apiData = await response.json();
            if (signal?.aborted) return;

            let audioFileName = "";
            let rawMwPron = "";

            if (Array.isArray(apiData) && apiData.length > 0 && typeof apiData[0] === "object") {
                let targetEntry = apiData[0];

                if (partOfSpeech) {
                    const searchPos = partOfSpeech.trim().toLowerCase();
                    const matchedEntry = apiData.find((entry: any) => {
                        if (!entry.fl) return false;
                        const fl = String(entry.fl).toLowerCase();
                        return fl === searchPos || fl.includes(searchPos);
                    });

                    if (matchedEntry) {
                        targetEntry = matchedEntry;
                    }
                }

                if (targetEntry.hwi && targetEntry.hwi.prs && targetEntry.hwi.prs.length > 0) {
                    const prsObj = targetEntry.hwi.prs[0];
                    if (prsObj.sound) {
                        audioFileName = prsObj.sound.audio;
                    }
                    if (prsObj.mw) {
                        rawMwPron = prsObj.mw;
                    }
                }

                if ((!audioFileName || !rawMwPron) && apiData[0].hwi && apiData[0].hwi.prs && apiData[0].hwi.prs.length > 0) {
                    const firstPrsObj = apiData[0].hwi.prs[0];
                    if (!audioFileName && firstPrsObj.sound) {
                        audioFileName = firstPrsObj.sound.audio;
                    }
                    if (!rawMwPron && firstPrsObj.mw) {
                        rawMwPron = firstPrsObj.mw;
                    }
                }
            }

            if (audioFileName) {
                let subdir = audioFileName.charAt(0);
                if (audioFileName.startsWith("bix")) subdir = "bix";
                else if (audioFileName.startsWith("gg")) subdir = "gg";
                else if (/^[^a-zA-Z]/.test(subdir)) subdir = "number";

                audioUrl = `https://media.merriam-webster.com/audio/prons/en/us/mp3/${subdir}/${audioFileName}.mp3`;
            }

            ipaText = safeConvertMwToIpa(rawMwPron);
            saveAudioCache(cacheKey, { audioUrl, ipaText });
        }

        if (signal?.aborted) return;

        const audioBox = document.getElementById(`audio-box-${num}`);
        if (!audioBox) return;

        audioBox.innerHTML = `
            <div style="display: inline-flex; align-items: center; gap: 6px; margin-bottom: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                ${audioUrl ? `<span class="audio_button" style="cursor:pointer; display: inline-flex; align-items: center;"><i class="fa-solid fa-volume-high fa-rotate-by fa-sm" style="color: #ffffff; --fa-rotate-angle: 340deg;"></i></span>` : ""}
                ${ipaText ? `<span class="ipa-text">${renderInteractiveIpaHtml(ipaText)}</span>` : ""}
            </div>
        `;

       if (ipaText) {
            bindInteractiveIpaEvents(audioBox, ipaText, word);
        }

        if (audioUrl) {
            const btn = audioBox.querySelector<HTMLElement>(".audio_button");
            if (btn) {
                btn.addEventListener("click", (e: MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (btn.dataset.playing === "true") return;

                    if (activePlayingBtn && activePlayingBtn !== btn) {
                        activePlayingBtn.dataset.playing = "false";
                        activePlayingBtn.style.opacity = "1";
                    }

                    activePlayingBtn = btn;
                    btn.dataset.playing = "true";
                    btn.style.opacity = "0.5";

                    sharedAudioPlayer.pause();
                    sharedAudioPlayer.src = audioUrl;
                    sharedAudioPlayer.currentTime = 0;

                    const resetBtn = (): void => {
                        btn.dataset.playing = "false";
                        btn.style.opacity = "1";
                        if (activePlayingBtn === btn) {
                            activePlayingBtn = null;
                        }
                    };

                    sharedAudioPlayer.onended = resetBtn;
                    sharedAudioPlayer.onerror = resetBtn;

                    sharedAudioPlayer.play().catch(resetBtn);
                });
            }
        }
    } catch (error: any) {
        if (error && error.name === "AbortError") return;
    }
}