import { DictionaryEntry } from "./types.js";

export interface DidYouMeanCandidate {
    word: string;
    highlightedHtml: string;
    distance: number;
    isStemMatch: boolean;
    isFullMatch: boolean;
}

// 活用形（複数形・過去形・進行形・比較級など）から元の語幹候補を生成
function generateStemCandidates(query: string): Set<string> {
    const stems = new Set<string>();
    const q = query.toLowerCase();

    if (q.length <= 2) return stems;

    // -ies -> -y (studies -> study), -ied -> -y (studied -> study)
    if (q.endsWith("ies") && q.length > 4) stems.add(q.slice(0, -3) + "y");
    if (q.endsWith("ied") && q.length > 4) stems.add(q.slice(0, -3) + "y");

    // -es, -s
    if (q.endsWith("es") && q.length > 3) {
        stems.add(q.slice(0, -2));
        stems.add(q.slice(0, -1));
    } else if (q.endsWith("s") && !q.endsWith("ss") && q.length > 3) {
        stems.add(q.slice(0, -1));
    }

    // -ed, -d
    if (q.endsWith("ed") && q.length > 3) {
        const base = q.slice(0, -2);
        stems.add(base);
        stems.add(q.slice(0, -1)); // liked -> like
        // 短母音+子音重ね (stopped -> stop)
        if (base.length >= 3 && base[base.length - 1] === base[base.length - 2]) {
            stems.add(base.slice(0, -1));
        }
    }

    // -ing
    if (q.endsWith("ing") && q.length > 4) {
        const base = q.slice(0, -3);
        stems.add(base);
        stems.add(base + "e"); // making -> make
        // 短母音+子音重ね (running -> run)
        if (base.length >= 3 && base[base.length - 1] === base[base.length - 2]) {
            stems.add(base.slice(0, -1));
        }
    }

    // -er, -est, -ly
    if (q.endsWith("er") && q.length > 4) {
        stems.add(q.slice(0, -2));
        stems.add(q.slice(0, -1));
    }
    if (q.endsWith("est") && q.length > 5) {
        stems.add(q.slice(0, -3));
        stems.add(q.slice(0, -2));
    }
    if (q.endsWith("ly") && q.length > 4) {
        stems.add(q.slice(0, -2));
        if (q.endsWith("ily") && q.length > 5) {
            stems.add(q.slice(0, -3) + "y");
        }
    }

    return stems;
}

// レーベンシュタイン距離のDPテーブル作成と、異なる文字の赤色ハイライトHTML生成
// （入力途中のタイプミスの場合は未入力の末尾を赤くせず、間違えた文字のみを赤色にする）
function computeAlignmentAndHighlight(
    inputStr: string,
    targetWord: string,
    isStemMatch: boolean
): { fullDistance: number; prefixDistance: number; highlightedHtml: string } {
    const s = inputStr.toLowerCase();
    const t = targetWord.toLowerCase();
    const m = s.length;
    const n = t.length;

    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (s[i - 1] === t[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = Math.min(
                    dp[i - 1][j - 1] + 1, // 置換
                    dp[i][j - 1] + 1,     // 挿入（候補側に文字がある）
                    dp[i - 1][j] + 1      // 削除（入力側のみに余分な文字がある）
                );
            }
        }
    }

    const fullDistance = dp[m][n];

    // 入力文字数が単語長より短い場合、先頭部分（入力途中の段階）での最小編集距離も調べる
    let bestJ = n;
    let prefixDistance = fullDistance;

    if (!isStemMatch && m < n && m >= 3) {
        const minJ = Math.max(2, m - 1);
        const maxJ = Math.min(n, m + 1);
        for (let j = minJ; j <= maxJ; j++) {
            if (dp[m][j] < prefixDistance) {
                prefixDistance = dp[m][j];
                bestJ = j;
            }
        }
    }

    // DPテーブルを (m, bestJ) から逆追跡し、候補単語(targetWord)の各文字が一致か差分かを判定
    const isDiffChar: boolean[] = Array(n).fill(false);
    let i = m;
    let j = bestJ;

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && s[i - 1] === t[j - 1] && dp[i][j] === dp[i - 1][j - 1]) {
            i--;
            j--;
        } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
            isDiffChar[j - 1] = true;
            i--;
            j--;
        } else if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
            isDiffChar[j - 1] = true;
            j--;
        } else {
            i--;
        }
    }

    const escapeHtml = (ch: string): string =>
        ch.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    let html = "";
    for (let k = 0; k < n; k++) {
        const charEscaped = escapeHtml(targetWord[k]);
        if (isDiffChar[k]) {
            html += `<span style="color: #dc2626; font-weight: 700;">${charEscaped}</span>`;
        } else {
            html += charEscaped;
        }
    }

    return {
        fullDistance,
        prefixDistance,
        highlightedHtml: html
    };
}

// 辞書データから「もしかして」の候補を抽出する
export function findDidYouMeanCandidates(
    query: string,
    words: DictionaryEntry[],
    maxResults = 8
): DidYouMeanCandidate[] {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery || cleanQuery.length < 2) return [];

    const stemCandidates = generateStemCandidates(cleanQuery);
    const maxFullDistance = cleanQuery.length <= 4 ? 1 : cleanQuery.length <= 7 ? 2 : 3;
    const maxPrefixDistance = cleanQuery.length <= 5 ? 1 : 2;

    const seenWords = new Set<string>();
    const results: DidYouMeanCandidate[] = [];

    for (let i = 0; i < words.length; i++) {
        const rawWord = words[i].word;
        if (!rawWord || typeof rawWord !== "string") continue;

        const targetWord = rawWord.trim();
        const lowerTarget = targetWord.toLowerCase();

        if (seenWords.has(lowerTarget) || lowerTarget === cleanQuery) continue;

        const isStemMatch = stemCandidates.has(lowerTarget);

        // 入力より極端に短い単語はスキップ
        if (!isStemMatch && lowerTarget.length < cleanQuery.length - maxFullDistance) {
            continue;
        }

        const { fullDistance, prefixDistance, highlightedHtml } = computeAlignmentAndHighlight(
            cleanQuery,
            targetWord,
            isStemMatch
        );

        const isFullMatch = fullDistance <= maxFullDistance;
        const isPrefixMatch = cleanQuery.length >= 3 && prefixDistance <= maxPrefixDistance;

        if (isStemMatch || isFullMatch || isPrefixMatch) {
            seenWords.add(lowerTarget);
            results.push({
                word: targetWord,
                highlightedHtml,
                distance: isFullMatch ? fullDistance : prefixDistance,
                isStemMatch,
                isFullMatch
            });
        }
    }

    // 1. 活用形の一致 → 2. 単語全体での一致 → 3. 編集距離が小さい順 → 4. 先頭文字が一致している順 → 5. 文字数が近い順
    results.sort((a, b) => {
        if (a.isStemMatch !== b.isStemMatch) {
            return a.isStemMatch ? -1 : 1;
        }
        if (a.isFullMatch !== b.isFullMatch) {
            return a.isFullMatch ? -1 : 1;
        }
        if (a.distance !== b.distance) {
            return a.distance - b.distance;
        }
        const aStartsSame = a.word.toLowerCase()[0] === cleanQuery[0] ? 0 : 1;
        const bStartsSame = b.word.toLowerCase()[0] === cleanQuery[0] ? 0 : 1;
        if (aStartsSame !== bStartsSame) {
            return aStartsSame - bStartsSame;
        }
        const lenDiffA = Math.abs(a.word.length - cleanQuery.length);
        const lenDiffB = Math.abs(b.word.length - cleanQuery.length);
        if (lenDiffA !== lenDiffB) {
            return lenDiffA - lenDiffB;
        }
        return a.word.localeCompare(b.word);
    });

    return results.slice(0, maxResults);
}