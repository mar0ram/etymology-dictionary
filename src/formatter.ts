import { DictionaryEntry } from "./types.js";

// --- テキスト整形・見出し変換・約物カーニング処理 ---
export function createFormatter(query: string, words: DictionaryEntry[]): (text: string) => string {
    let relAudioCount = 0;

    return (text: string): string => {
        if (!text) return "";

        const headerPlaceholders: string[] = [];
        const preprocessedText = text
            .replace(
                /<span class="w">\s*<b>\s*【?\s*(?:(\d+)\s*\.\s*)?([^：:]+?)\s*[：:]\s*([\s\S]+?)\s*】?\s*<\/b>(?:<\/b>)?\s*<\/span>(?:<div id="(audio-box-[^"]+)" class="audio_box"[^>]*><\/div>)?(?:\r?\n)?/g,
                (_match, num, word, meaningStr, audioBoxId) => {
                    const meanings = String(meaningStr)
                        .split(/\s*[,，、]\s*/)
                        .map(s => s.trim())
                        .filter(Boolean);
                    const meaningTags = meanings
                        .map(m => `<span class="w-p4-meaning-item"><span class="w-p4-dot"></span><span>${m}</span></span>`)
                        .join("");
                    const numBadge = num ? `<span class="w-p4-num">${String(num).trim()}</span>` : "";
                    const audioBoxHtml = audioBoxId ? `<span id="${audioBoxId}" class="audio_box"></span>` : "";
                    const headerHtml = `<span class="w w-p4-header"><span class="w-p4-top">${numBadge}<span class="w-p4-word" lang="en">${String(word).trim()}</span>${audioBoxHtml}</span><span class="w-p4-meanings">${meaningTags}</span></span>`;
                    const placeholder = `<!--W_P4_HEADER_${headerPlaceholders.length}-->`;
                    headerPlaceholders.push(headerHtml);
                    return placeholder;
                }
            )
            .replace(
                /<b>\s*【\s*(?:(\d+)\s*\.\s*)?([^：:]+?)\s*[：:]\s*([\s\S]+?)\s*】\s*<\/b>/g,
                (_match, num, word, meaningStr) => {
                    const cleanWord = String(word).trim();
                    const relAudioKey = `rel-${++relAudioCount}`;
                    const meanings = String(meaningStr)
                        .split(/\s*[,，、]\s*/)
                        .map(s => s.trim())
                        .filter(Boolean);
                    const meaningTags = meanings
                        .map(m => `<span class="h3-p4-meaning-item"><span class="h3-p4-dot"></span><span>${m}</span></span>`)
                        .join("");
                    const numBadge = num ? `<span class="h3-p4-num">${String(num).trim()}</span>` : "";
                    const relAudioHtml = `<span id="audio-box-${relAudioKey}" class="audio_box h3-audio-box" data-audio-key="${relAudioKey}" data-word="${cleanWord}"></span>`;
                    const isWordInDict = words.some(
                        w => w.word && w.word.toLowerCase() === cleanWord.toLowerCase() && w.word.toLowerCase() !== query
                    );
                    const wordSpanHtml = isWordInDict
                        ? `<span class="h3-p4-word" lang="en" data-target-word="${cleanWord}"><span class="h3-word-link" data-target-word="${cleanWord}" style="display: inline-block; width: fit-content; align-self: flex-start; justify-self: start; cursor: pointer; text-decoration: underline; text-underline-offset: 3px;">${cleanWord}<i class="fa-solid fa-arrow-up-right-from-square fa-2xs" style="margin-left: 4px; opacity: 0.75;"></i></span></span>`
                        : `<span class="h3-p4-word" lang="en">${cleanWord}</span>`;
                    const barHtml = `<span class="h3-p4-bar">${numBadge}${wordSpanHtml}${relAudioHtml}<span class="h3-p4-meanings">${meaningTags}</span></span>`;
                    const placeholder = `<!--W_P4_HEADER_${headerPlaceholders.length}-->`;
                    headerPlaceholders.push(barHtml);
                    return placeholder;
                }
            );

        let html = preprocessedText.replace(/(<[^>]+>)|([a-zA-Z][a-zA-Z'-]*)/g, (match, tag, word) => {
            if (tag) return tag;
            if (word) return `<span lang="en" class="hyphen-auto">${word}</span>`;
            return match;
        });

        html = html.replace(/\r?\n/g, "<br>");
        html = html.replace(/([「『（【［〔〈《｛〚｟])/g, '<span class="margin-left-only">$1</span>');
        html = html.replace(/([」』）】］〕〉》｝〛｠])/g, '<span class="margin-right-bracket">$1</span>');
        html = html.replace(/([、。])/g, '<span class="margin-right-punctuation">$1</span>');
        html = html.replace(/([・])/g, '<span class="margin-both">$1</span>');
        html = html.replace(/([：])/g, '<span class="margin-both">$1</span>');

        html = html.replace(
            /(<span class="margin-right-bracket"[^>]*>[」』）】］〕〉》｝〛｠]<\/span>)<span class="margin-both"[^>]*>([・])<\/span>/g,
            '$1<span class="margin-both margin-reduce-bracket-dot">$2</span>'
        );
        html = html.replace(
            /(<span class="margin-right-bracket"[^>]*>[」』）】］〕〉》｝〛｠]<\/span>)<span class="margin-both"[^>]*>([：])<\/span>/g,
            '$1<span class="margin-both margin-reduce-bracket-colon">$2</span>'
        );
        html = html.replace(
            /(<span class="margin-both"[^>]*>[・]<\/span>)<span class="margin-left-only"[^>]*>([「『（【［〔〈《｛〚｟])<\/span>/g,
            '$1<span class="margin-left-only margin-reduce-dot-bracket">$2</span>'
        );
        html = html.replace(
            /(<span class="margin-both"[^>]*>[：]<\/span>)<span class="margin-left-only"[^>]*>([「『（【［〔〈《｛〚｟])<\/span>/g,
            '$1<span class="margin-left-only margin-reduce-colon-bracket">$2</span>'
        );
        html = html.replace(
            /(<span class="margin-right-punctuation"[^>]*>[」』）】］〕〉》｝〛｠]<\/span>)<span class="margin-right-punctuation"[^>]*>([、。])<\/span>/g,
            '$1<span class="margin-right-punctuation margin-reduce-bracket-punctuation">$2</span>'
        );
        html = html.replace(
            /(<span class="margin-right-punctuation"[^>]*>[、。]<\/span>)<span class="margin-left-only"[^>]*>([「『（【［〔〈《｛〚｟])<\/span>/g,
            '$1<span class="margin-left-only margin-reduce-punctuation-bracket">$2</span>'
        );

        headerPlaceholders.forEach((headerHtml, idx) => {
            html = html.replace(`<!--W_P4_HEADER_${idx}-->`, headerHtml);
        });

        return html;
    };
}