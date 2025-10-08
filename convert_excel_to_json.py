import pandas as pd
import json

df = pd.read_excel("data/etymology.xlsx")

# JSON 用データ生成
data_list = df.fillna("").to_dict(orient="records")
with open("docs/data.json", "w", encoding="utf-8") as f:
    json.dump(data_list, f, ensure_ascii=False, indent=2)

html_output = "<!DOCTYPE html>\n<html>\n<head>\n<meta charset='utf-8'><title>Dictionary</title></head>\n<body>\n"

for _, row in df.iterrows():
    num = str(int(row["num"]))
    word = row["word"]
    html_output += f'<div class="entry">\n'
    html_output += f'  <div class="head"><span class="num">{num}.</span> {word}</div>\n'

    # h1〜h6 を順に処理
    h_cols = [col for col in df.columns if col.startswith("h")]
    for i, h_col in enumerate(h_cols):
        h_val = row.get(h_col)
        if pd.isna(h_val):
            continue

        # 次の見出し列を探す
        next_h = h_cols[i + 1] if i + 1 < len(h_cols) else None
        start_idx = df.columns.get_loc(h_col) + 1
        end_idx = df.columns.get_loc(next_h) if next_h else len(df.columns)

        # 子要素を取得
        sub_data = row.iloc[start_idx:end_idx].dropna()

        # 子要素がなければスキップ
        if sub_data.empty:
            continue

        html_output += f'  <div class="section">\n'
        html_output += f'    <div class="subtitle">{h_val}</div>\n'
        html_output += f'    <div class="content">\n'

        # 特殊パターンごとにフォーマット
        if "要素" in str(h_val):
            parts = " + ".join(sub_data.values)
            html_output += f"      {parts}\n"

        elif "語源" in str(h_val):
            for j in range(1, 7):
                tag, p = row.get(f"tag{j}"), row.get(f"p{j}")
                if pd.notna(tag) or pd.notna(p):
                    html_output += f'      <div>{tag or ""} {p or ""}</div>\n'

        elif "意味" in str(h_val):
            for j in range(1, 7):
                per, mean = row.get(f"period{j}"), row.get(f"meaning{j}")
                if pd.notna(per) or pd.notna(mean):
                    html_output += f'      <div>{per or ""}：{mean or ""}</div>\n'

        else:
            for val in sub_data.values:
                html_output += f"      <div>{val}</div>\n"

        html_output += f"    </div>\n"
        html_output += f"  </div>\n"

    html_output += f"</div>\n\n"

# 出力保存
with open("docs/dictionary.html", "w", encoding="utf-8") as f:
    f.write(html_output)

print("✅ dictionary.html が生成されました！")
