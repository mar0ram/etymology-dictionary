import pandas as pd
import json
import os

# --- 設定 ---
EXCEL_PATH = "data/etymology.xlsx"
JSON_OUT = "docs/data.json"
HTML_OUT = "docs/dictionary.html"

# 保存先ディレクトリの作成
os.makedirs("docs", exist_ok=True)

# 1. Excel 読み込み
df = pd.read_excel(EXCEL_PATH)

# 2. JSON 用データ生成
# セルが空の場合は空文字にする
data_list = df.fillna("").to_dict(orient="records")
with open(JSON_OUT, "w", encoding="utf-8") as f:
    json.dump(data_list, f, ensure_ascii=False, indent=2)

# 3. HTML 生成
html_output = "<!DOCTYPE html>\n<html lang='ja'>\n<head>\n"
html_output += "<meta charset='utf-8'>\n"
html_output += (
    "<meta name='viewport' content='width=device-width, initial-scale=1.0'>\n"
)
html_output += "<title>Dictionary Archive</title>\n"
html_output += (
    "<link rel='stylesheet' href='style.css'>\n"  # CSSファイルが同階層にある想定
)
html_output += "</head>\n<body>\n<div id='results'>\n"  # JSと同じ親IDにしてCSSを適用


# 改行を<br>に変換する関数
def nl2br(text):
    if not text:
        return ""
    return str(text).replace("\n", "<br>")


for _, row in df.iterrows():
    # --- num の判定ロジック ---
    if pd.isna(row.get("num")):
        num_str = "empty"
    else:
        try:
            val = int(row["num"])
            num_str = str(val - 1500) if val >= 1501 else str(val)
        except (ValueError, TypeError):
            num_str = "empty"

    word = row.get("word", "")

    # エントリ開始
    html_output += f'<div class="entry">\n'
    html_output += f'  <div class="head">{num_str}. {word}</div>\n'

    # 左右パネルのラッパー
    html_output += '  <div class="section-wrapper">\n'

    # 左パネル (main-info-panel) と 右パネル (timeline-panel) の準備
    main_panel_html = '    <div class="main-info-panel">\n'
    timeline_panel_html = '    <div class="timeline-panel">\n'

    # 全列名を取得して h から始まる列を抽出
    all_cols = list(df.columns)
    h_cols = [
        col
        for col in all_cols
        if col.startswith("h") and pd.notna(row.get(col)) and row.get(col) != ""
    ]

    for i, h_col in enumerate(h_cols):
        h_val = row[h_col]

        # 子要素の範囲を特定
        start_idx = all_cols.index(h_col) + 1
        if i + 1 < len(h_cols):
            next_h = h_cols[i + 1]
            end_idx = all_cols.index(next_h)
        else:
            end_idx = len(all_cols)

        # 子要素データの抽出（空でないもの）
        sub_data_keys = [
            all_cols[j]
            for j in range(start_idx, end_idx)
            if pd.notna(row.get(all_cols[j])) and row.get(all_cols[j]) != ""
        ]

        if not sub_data_keys:
            continue

        # セクションHTMLの構築
        section_html = f'      <div class="section {h_col}">\n'
        section_html += f'        <div class="subtitle">{h_val}</div>\n'
        section_html += f'        <div class="content">\n'

        # JS側の分岐ロジックを再現
        if h_col.startswith("h1"):
            for k in sub_data_keys:
                section_html += f"          <div>{nl2br(row[k])}</div>\n"

        elif h_col.startswith("h5"):
            j = 1
            while f"tag{j}" in row or f"p{j}" in row:
                tag = row.get(f"tag{j}", "")
                p = row.get(f"p{j}", "")
                if pd.notna(tag) and tag != "":
                    section_html += f'          <span class="tag">{nl2br(tag)}</span>\n'
                if pd.notna(p) and p != "":
                    section_html += f'          <div class="p">{nl2br(p)}</div>\n'
                j += 1
                if j > 10:
                    break  # 無限ループ防止

        elif h_col.startswith("h6"):
            j = 1
            while f"period{j}" in row or f"meaning{j}" in row:
                per = row.get(f"period{j}", "")
                mean = row.get(f"meaning{j}", "")
                if (pd.notna(per) and per != "") or (pd.notna(mean) and mean != ""):
                    section_html += f'          <div class="period-meaning"><span class="period">{nl2br(per)}</span><span class="meaning">{nl2br(mean)}</span></div>\n'
                j += 1
                if j > 10:
                    break

        else:
            for k in sub_data_keys:
                section_html += f"          <div>{nl2br(row[k])}</div>\n"

        section_html += "        </div>\n      </div>\n"

        # 左右パネルへの振り分け
        if h_col.startswith("h1") or h_col.startswith("h5"):
            main_panel_html += section_html
        else:
            timeline_panel_html += section_html

    # パネルを閉じる
    main_panel_html += "    </div>\n"
    timeline_panel_html += "    </div>\n"

    # 合体
    html_output += main_panel_html
    html_output += timeline_panel_html
    html_output += "  </div>\n"  # section-wrapper 閉じ
    html_output += "</div>\n\n"  # entry 閉じ

html_output += "</div>\n</body>\n</html>"

# 4. 出力保存
with open(HTML_OUT, "w", encoding="utf-8") as f:
    f.write(html_output)

print(f"✅ {HTML_OUT} が生成されました！")
