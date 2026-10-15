import os
import json
import time
import urllib.request
import urllib.parse
import openpyxl

# --- パス設定の修正（docsの中ではなく、ルートディレクトリを基準にする） ---
BASE_DIR = (
    os.path.dirname(os.path.abspath(__file__))
    if "__file__" in globals()
    else os.getcwd()
)
# もしこのスクリプトを docs フォルダの中に置いている場合は、一つ上の階層をルートにする
if os.path.basename(BASE_DIR) == "docs":
    BASE_DIR = os.path.dirname(BASE_DIR)

EXCEL_PATH = os.path.join(BASE_DIR, "data", "etymology.xlsx")
DOCS_DIR = os.path.join(BASE_DIR, "docs")
NGRAM_JSON_OUT = os.path.join(DOCS_DIR, "ngram_data.json")

os.makedirs(DOCS_DIR, exist_ok=True)

# 1. 既存の ngram_data.json があれば読み込む（差分取得・途中再開用）
if os.path.exists(NGRAM_JSON_OUT):
    try:
        with open(NGRAM_JSON_OUT, "r", encoding="utf-8") as f:
            ngram_cache = json.load(f)
    except Exception:
        ngram_cache = {}
else:
    ngram_cache = {}

# 2. Excelから num <= 1500 の英単語リストを抽出
wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
sheet = wb.active
excel_data = list(sheet.values)
columns = excel_data[0]
rows = excel_data[1:]

num_idx = columns.index("num")
word_idx = columns.index("word")

target_words = []
for row in rows:
    num_val = row[num_idx]
    word_val = row[word_idx]
    if num_val is not None and word_val:
        try:
            if int(num_val) <= 1500:
                w = str(word_val).strip()
                if w and w not in ngram_cache and w not in target_words:
                    target_words.append(w)
        except (ValueError, TypeError):
            continue

print(f"取得済み単語数: {len(ngram_cache)} 語")
print(f"今回新規に取得する単語数: {len(target_words)} 語")


def fetch_ngram_batch(words_list):
    """複数単語をカンマ区切りで一括取得する関数"""
    content_param = ",".join(words_list)
    query = urllib.parse.urlencode({
        "content": content_param,
        "year_start": 1500,
        "year_end": 2022,
        "corpus": 26,
        "smoothing": 3
    })
    url = f"https://books.google.com/ngrams/json?{query}"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    )
    with urllib.request.urlopen(req, timeout=15) as res:
        data = json.loads(res.read().decode("utf-8"))

    result_map = {}
    if isinstance(data, list):
        for entry in data:
            ngram_name = entry.get("ngram")
            timeseries = entry.get("timeseries")
            if ngram_name and isinstance(timeseries, list):
                result_map[ngram_name] = [round(v * 100, 6) for v in timeseries]
    return result_map


# 3. 10単語ずつバッチ処理で取得（50語ごとに自動保存）
BATCH_SIZE = 10

for i in range(0, len(target_words), BATCH_SIZE):
    batch = target_words[i:i + BATCH_SIZE]
    try:
        batch_result = fetch_ngram_batch(batch)
        for w in batch:
            if w in batch_result:
                ngram_cache[w] = batch_result[w]
            else:
                matched = next(
                    (v for k, v in batch_result.items() if k.lower() == w.lower()),
                    None
                )
                if matched is not None:
                    ngram_cache[w] = matched
        print(f"[{min(i + BATCH_SIZE, len(target_words))}/{len(target_words)}] 取得成功: {', '.join(batch)}")
    except Exception as e:
        print(f"⚠️ バッチ取得失敗 ({e}) -> 1語ずつ取得に切り替えます...")
        for w in batch:
            try:
                single_res = fetch_ngram_batch([w])
                if w in single_res:
                    ngram_cache[w] = single_res[w]
                time.sleep(1.0)
            except Exception as single_err:
                print(f"  ❌ '{w}' の取得失敗: {single_err}")

    if (i // BATCH_SIZE + 1) % 5 == 0 or (i + BATCH_SIZE) >= len(target_words):
        with open(NGRAM_JSON_OUT, "w", encoding="utf-8") as f:
            json.dump(ngram_cache, f, ensure_ascii=False, separators=(",", ":"))
        print(f"💾 {NGRAM_JSON_OUT} に保存しました（累計 {len(ngram_cache)} 語）")

    time.sleep(1.5)

print(f"✅ 完了しました！ 合計 {len(ngram_cache)} 語のデータが {NGRAM_JSON_OUT} に保存されています。")