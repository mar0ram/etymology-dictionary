export function prependEntry() {
    // === ここからカレンダー表エントリの作成 ===
    // スクロールバーのカスタムスタイルを追加
    if (!document.getElementById('cyber-popup-style')) {
        const style = document.createElement('style');
        style.id = 'cyber-popup-style';
        style.textContent = `
            .cyber-popup::-webkit-scrollbar {
                width: 8px;
            }
            .cyber-popup::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 4px;
            }
            .cyber-popup::-webkit-scrollbar-thumb {
                background: var(--popup-theme-color, #888);
                border-radius: 4px;
            }
            .cyber-popup {
                scrollbar-width: thin;
                scrollbar-color: var(--popup-theme-color, #888) rgba(255, 255, 255, 0.1);
            }
        `;
        document.head.appendChild(style);
    }

    const calendarEntry = document.createElement('div');
    calendarEntry.className = 'entry';

    const calendarHead = document.createElement('div');
    calendarHead.className = 'head';
    calendarHead.textContent = '学習計画：夏終わりまでが勝負';
    calendarEntry.appendChild(calendarHead);

    const tableWrapper = document.createElement('div');
    tableWrapper.style.width = '100%';
    tableWrapper.style.margin = '15px 0';
    tableWrapper.style.overflowX = 'auto';

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.backgroundColor = 'transparent';
    table.style.tableLayout = 'fixed';

    const rows = ['1900', '1000', 'NS', '長文'];
    const monthsPage1 = ['5月', '6月', '<span class="calender_text_orange">7月</span>', '<span class="calender_text_orange">8月</span>'];
    const monthsPage2 = ['9月', '10月', '11月', '12月'];

    // 行タップ時の背景色を定義
    const rowColors = [
        'rgba(0, 123, 255, 0.15)', // 1900: 透明度の高い青色
        'rgba(255, 215, 0, 0.25)', // 1000: 透明度の高い黄色
        'rgba(255, 0, 0, 0.15)',   // NS: 透明度の高い赤色
        'rgba(0, 128, 0, 0.15)'    // 長文: 透明度の高い緑色
    ];

    const cellData = [
        ['<span class="calender_bgc calender_bgc_1900">~800</span><br>100問テスト',
            '<span class="calender_bgc calender_bgc_1900">~800</span><br><span class="calender_day">月</span>～<span class="calender_day">木</span><br>50問テスト<br><span class="calender_day">金</span><br>テスト復習<br><span class="calender_bgc calender_bgc_1900">801~</span><br><span class="calender_day">月</span>～<span class="calender_day">金</span><br>新：30<br>復：30<br><span class="calender_day calender_text_red">土</span><br>100問テスト<br><span class="calender_day calender_text_red">日</span><br>100問テスト',
            '<span class="calender_bgc calender_bgc_1900">~800</span><br><span class="calender_day">月</span>～<span class="calender_day">木</span><br>50問テスト<br><span class="calender_day">金</span><br>テスト復習<br><span class="calender_bgc calender_bgc_1900">801~</span><br><span class="calender_day">月</span>～<span class="calender_day">金</span><br>新：30<br>復：30<br><span class="calender_day calender_text_red">土</span><br>100問テスト<br><span class="calender_day calender_text_red">日</span><br>100問テスト',
            '<span class="calender_bgc calender_bgc_1900">~800</span><br><span class="calender_day">月</span>～<span class="calender_day">木</span><br>50問テスト<br><span class="calender_day">金</span><br>テスト復習<br><span class="calender_bgc calender_bgc_1900">801~</span><br><span class="calender_day">月</span>～<span class="calender_day">金</span><br>新：30<br>復：30<br><span class="calender_day calender_text_red">土</span><br>100問テスト<br><span class="calender_day calender_text_red">日</span><br>100問テスト',
            '<span class="calender_bgc calender_bgc_1900">~1500</span><br>8月の結果次第',
            '<span class="calender_bgc calender_bgc_1900">~1500</span><br>8月の結果次第',
            '<span class="calender_bgc calender_bgc_1900">~1500</span><br>8月の結果次第',
            '<span class="calender_bgc calender_bgc_1900">~1500</span><br>8月の結果次第'], // 1900
        ['<span class="calender_bgc calender_bgc_1000">~500</span><br><span class="calender_day">月</span>～<span class="calender_day calender_text_red">日</span><br>新：30<br>復：30',
            '<span class="calender_bgc calender_bgc_1000">~500</span><br><span class="calender_day">月</span>～<span class="calender_day">金</span><br>新：30<br>復：30<br><span class="calender_day calender_text_red">土</span><br>100問テスト<br><span class="calender_day calender_text_red">日</span><br>100問テスト',
            '<span class="calender_bgc calender_bgc_1000">501~</span><br><span class="calender_day">月</span>～<span class="calender_day">金</span><br>新：30<br>復：30<br><span class="calender_day calender_text_red">土</span><br>100問テスト<br><span class="calender_day calender_text_red">日</span><br>100問テスト',
            '<span class="calender_bgc calender_bgc_1000">1000</span><br><span class="calender_day">月</span>～<span class="calender_day calender_text_red">日</span><br>新：30<br>復：30<br><br>50問テスト<br>間違い復習',
            '<span class="calender_bgc calender_bgc_1000">1000</span><br>8月の結果次第',
            '<span class="calender_bgc calender_bgc_1000">1000</span><br>8月の結果次第',
            '<span class="calender_bgc calender_bgc_1000">1000</span><br>8月の結果次第',
            '<span class="calender_bgc calender_bgc_1000">1000</span><br>8月の結果次第'], // 1000
        ['<span class="calender_bgc calender_bgc_NS">文法</span><br><span class="calender_day">月</span>～<span class="calender_day calender_text_red">日</span><br>30問<br><span class="calender_bgc calender_bgc_NS">語法</span><br><span class="calender_day">月</span>～<span class="calender_day calender_text_red">日</span><br>30問',
            '<span class="calender_bgc calender_bgc_NS">文法</span><br><span class="calender_day">月</span>～<span class="calender_day calender_text_red">日</span><br>30問<br><span class="calender_bgc calender_bgc_NS">語法</span><br><span class="calender_day">月</span>～<span class="calender_day calender_text_red">日</span><br>30問',
            '<span class="calender_bgc calender_bgc_NS">文法</span><br><span class="calender_day">月</span>～<span class="calender_day calender_text_red">日</span><br>30問<br><span class="calender_bgc calender_bgc_NS">語法</span><br><span class="calender_day">月</span>～<span class="calender_day calender_text_red">日</span><br>30問',
            '<span class="calender_bgc calender_bgc_NS">文法</span><br><span class="calender_day">月</span>～<span class="calender_day calender_text_red">日</span><br>30問<br><span class="calender_bgc calender_bgc_NS">語法</span><br><span class="calender_day">月</span>～<span class="calender_day calender_text_red">日</span><br>30問',
            '<span class="calender_bgc calender_bgc_NS">文法</span><br><span class="calender_day">月</span>～<span class="calender_day calender_text_red">日</span><br>30問<br><span class="calender_bgc calender_bgc_NS">語法</span><br><span class="calender_day">月</span>～<span class="calender_day calender_text_red">日</span><br>30問',
            '<span class="calender_bgc calender_bgc_NS">文法</span><br><span class="calender_day">月</span>～<span class="calender_day calender_text_red">日</span><br>30問<br><span class="calender_bgc calender_bgc_NS">語法</span><br><span class="calender_day">月</span>～<span class="calender_day calender_text_red">日</span><br>30問',
            '<span class="calender_bgc calender_bgc_NS">文法</span><br><span class="calender_day">月</span>～<span class="calender_day calender_text_red">日</span><br>30問<br><span class="calender_bgc calender_bgc_NS">語法</span><br><span class="calender_day">月</span>～<span class="calender_day calender_text_red">日</span><br>30問',
            '<span class="calender_bgc calender_bgc_NS">文法</span><br><span class="calender_day">月</span>～<span class="calender_day calender_text_red">日</span><br>30問<br><span class="calender_bgc calender_bgc_NS">語法</span><br><span class="calender_day">月</span>～<span class="calender_day calender_text_red">日</span><br>30問'], // NS
        ['',
            '',
            '<span class="calender_bgc calender_bgc_reading">300語</span><br>週１題<br><span class="calender_bgc calender_bgc_reading">500語</span><br>週１題',
            '<span class="calender_bgc calender_bgc_reading">300語</span><br>週１題<br><span class="calender_bgc calender_bgc_reading">500語</span><br>週１題',
            '',
            '',
            '',
            '']  // 長文
    ];

    // tdクリック時に表示する補足情報の配列
    const popupData = [
        ['5月は1～800までの100問テストを毎日行い、6月から始める801以降の単語学習の準備。<br>6月からは1～800の復習と、801以降の単語勉強を同時並行で進めていく。',
            `
<table style="width: 100%; border-collapse: collapse; text-align: center; margin-top: 10px;">
    <thead>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle; width: 1%; white-space: nowrap;"></th>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle; width: 50%;"><span class="calender_bgc calender_bgc_1900">~800</span><br>1週間で200個<br>1ヶ月で800個</th>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle; width: 50%;"><span class="calender_bgc calender_bgc_1900">801~</span><br>1週間で150個<br>1ヶ月で600個</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day">月</span></th>
            <td id="cell-mon-800" style="border: 1px solid #ccc; padding: 10px 6px;"><span class="calender_bgc calender_bgc_tag">テスト</span><br>50問テスト<br>1枚の半分だけ<br><span class="calender_text_blue">毎日異なる50問</span><br><span class="calender_text_red">間違いに必ず☑</span><br><span>☑を金曜に解く</span></td>
            <td id="cell-mon-801" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">単語覚え</span><br>30個は前日の復習<br>30個は新しい単語</td>
        </tr>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day">火</span></th>
            <td id="cell-tue-800" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">テスト</span><br>50問テスト<br>1枚の半分だけ<br><span class="calender_text_blue">毎日異なる50問</span><br><span class="calender_text_red">間違いに必ず☑</span><br><span>☑を金曜に解く</span></td>
            <td id="cell-tue-801" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">単語覚え</span><br>30個は前日の復習<br>30個は新しい単語</td>
        </tr>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day">水</span></th>
            <td id="cell-wed-800" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">テスト</span><br>50問テスト<br>1枚の半分だけ<br><span class="calender_text_blue">毎日異なる50問</span><br><span class="calender_text_red">間違いに必ず☑</span><br><span>☑を金曜に解く</span></td>
            <td id="cell-wed-801" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">単語覚え</span><br>30個は前日の復習<br>30個は新しい単語</td>
        </tr>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day">木</span></th>
            <td id="cell-thu-800" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">テスト</span><br>50問テスト<br>1枚の半分だけ<br><span class="calender_text_blue">毎日異なる50問</span><br><span class="calender_text_red">間違いに必ず☑</span><br><span>☑を金曜に解く</span></td>
            <td id="cell-thu-801" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">単語覚え</span><br>30個は前日の復習<br>30個は新しい単語</td>
        </tr>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day">金</span></th>
            <td id="cell-fri-800" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">復習</span><br>月～木の<span class="calender_text_red">☑</span>を<br>全問正解するまで<br>何度も復習する</td>
            <td id="cell-fri-801" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">単語覚え</span><br>30個は前日の復習<br>30個は新しい単語</td>
        </tr>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day calender_text_red">土</span></th>
            <td id="cell-sat-800" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"></td>
            <td id="cell-sat-801" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">テスト</span><br>勉強した中から<br>100問テスト</td>
        </tr>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day calender_text_red">日</span></th>
            <td id="cell-sun-800" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"></td>
            <td id="cell-sun-801" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">テスト</span><br>勉強した中から<br>100問テスト</td>
        </tr>
    </tbody>
</table>
`,
            `
<table style="width: 100%; border-collapse: collapse; text-align: center; margin-top: 10px;">
    <thead>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle; width: 1%; white-space: nowrap;"></th>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle; width: 50%;"><span class="calender_bgc calender_bgc_1900">~800</span><br>1週間で200個<br>1ヶ月で800個</th>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle; width: 50%;"><span class="calender_bgc calender_bgc_1900">801~</span><br>1週間で150個<br>1ヶ月で600個</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day">月</span></th>
            <td id="cell-mon-800" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">テスト</span><br>50問テスト<br>1枚の半分だけ<br><span class="calender_text_blue">毎日異なる50問</span><br><span class="calender_text_red">間違いに必ず☑</span><br><span>☑を金曜に解く</span></td>
            <td id="cell-mon-801" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">単語覚え</span><br>30個は前日の復習<br>30個は新しい単語</td>
        </tr>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day">火</span></th>
            <td id="cell-tue-800" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">テスト</span><br>50問テスト<br>1枚の半分だけ<br><span class="calender_text_blue">毎日異なる50問</span><br><span class="calender_text_red">間違いに必ず☑</span><br><span>☑を金曜に解く</span></td>
            <td id="cell-tue-801" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">単語覚え</span><br>30個は前日の復習<br>30個は新しい単語</td>
        </tr>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day">水</span></th>
            <td id="cell-wed-800" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">テスト</span><br>50問テスト<br>1枚の半分だけ<br><span class="calender_text_blue">毎日異なる50問</span><br><span class="calender_text_red">間違いに必ず☑</span><br><span>☑を金曜に解く</span></td>
            <td id="cell-wed-801" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">単語覚え</span><br>30個は前日の復習<br>30個は新しい単語</td>
        </tr>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day">木</span></th>
            <td id="cell-thu-800" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">テスト</span><br>50問テスト<br>1枚の半分だけ<br><span class="calender_text_blue">毎日異なる50問</span><br><span class="calender_text_red">間違いに必ず☑</span><br><span>☑を金曜に解く</span></td>
            <td id="cell-thu-801" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">単語覚え</span><br>30個は前日の復習<br>30個は新しい単語</td>
        </tr>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day">金</span></th>
            <td id="cell-fri-800" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">復習</span><br>月～木の<span class="calender_text_red">☑</span>を<br>全問正解するまで<br>何度も復習する</td>
            <td id="cell-fri-801" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">単語覚え</span><br>30個は前日の復習<br>30個は新しい単語</td>
        </tr>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day calender_text_red">土</span></th>
            <td id="cell-sat-800" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"></td>
            <td id="cell-sat-801" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">テスト</span><br>勉強した中から<br>100問テスト</td>
        </tr>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day calender_text_red">日</span></th>
            <td id="cell-sun-800" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"></td>
            <td id="cell-sun-801" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">テスト</span><br>勉強した中から<br>100問テスト</td>
        </tr>
    </tbody>
</table>
`,
            `
<table style="width: 100%; border-collapse: collapse; text-align: center; margin-top: 10px;">
    <thead>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle; width: 1%; white-space: nowrap;"></th>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle; width: 50%;"><span class="calender_bgc calender_bgc_1900">~800</span><br>1週間で200個<br>1ヶ月で800個</th>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle; width: 50%;"><span class="calender_bgc calender_bgc_1900">801~</span><br>1週間で150個<br>1ヶ月で600個</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day">月</span></th>
            <td id="cell-mon-800" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">テスト</span><br>50問テスト<br>1枚の半分だけ<br><span class="calender_text_blue">毎日異なる50問</span><br><span class="calender_text_red">間違いに必ず☑</span><br><span>☑を金曜に解く</span></td>
            <td id="cell-mon-801" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">単語覚え</span><br>30個は前日の復習<br>30個は新しい単語</td>
        </tr>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day">火</span></th>
            <td id="cell-tue-800" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">テスト</span><br>50問テスト<br>1枚の半分だけ<br><span class="calender_text_blue">毎日異なる50問</span><br><span class="calender_text_red">間違いに必ず☑</span><br><span>☑を金曜に解く</span></td>
            <td id="cell-tue-801" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">単語覚え</span><br>30個は前日の復習<br>30個は新しい単語</td>
        </tr>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day">水</span></th>
            <td id="cell-wed-800" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">テスト</span><br>50問テスト<br>1枚の半分だけ<br><span class="calender_text_blue">毎日異なる50問</span><br><span class="calender_text_red">間違いに必ず☑</span><br><span>☑を金曜に解く</span></td>
            <td id="cell-wed-801" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">単語覚え</span><br>30個は前日の復習<br>30個は新しい単語</td>
        </tr>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day">木</span></th>
            <td id="cell-thu-800" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">テスト</span><br>50問テスト<br>1枚の半分だけ<br><span class="calender_text_blue">毎日異なる50問</span><br><span class="calender_text_red">間違いに必ず☑</span><br><span>☑を金曜に解く</span></td>
            <td id="cell-thu-801" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">単語覚え</span><br>30個は前日の復習<br>30個は新しい単語</td>
        </tr>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day">金</span></th>
            <td id="cell-fri-800" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">復習</span><br>月～木の<span class="calender_text_red">☑</span>を<br>全問正解するまで<br>何度も復習する</td>
            <td id="cell-fri-801" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">単語覚え</span><br>30個は前日の復習<br>30個は新しい単語</td>
        </tr>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day calender_text_red">土</span></th>
            <td id="cell-sat-800" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"></td>
            <td id="cell-sat-801" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">テスト</span><br>勉強した中から<br>100問テスト</td>
        </tr>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day calender_text_red">日</span></th>
            <td id="cell-sun-800" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"></td>
            <td id="cell-sun-801" style="border: 1px solid #ccc; padding: 10px 6px; vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">テスト</span><br>勉強した中から<br>100問テスト</td>
        </tr>
    </tbody>
</table>
`,
            '今後更新',
            '今後更新',
            '今後更新',
            '今後更新',],

        ['500個までをできるだけ覚えていく。',
            `
<table style="width: 100%; border-collapse: collapse; text-align: center; margin-top: 10px;">
    <thead>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle; width: 1%; white-space: nowrap;"></th>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle; width: 50%;"><span class="calender_bgc calender_bgc_1000">~500</span><br>1週間で150個<br>17日で500個</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day">月</span></th>
            <td id="cell-mon-800" style="border: 1px solid #ccc; padding: 10px 6px;  vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">単語覚え</span><br>30個は前日の復習<br>30個は新しい単語</td>
        </tr>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day">火</span></th>
            <td id="cell-tue-800" style="border: 1px solid #ccc; padding: 10px 6px;  vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">単語覚え</span><br>30個は前日の復習<br>30個は新しい単語</td>
        </tr>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day">水</span></th>
            <td id="cell-wed-800" style="border: 1px solid #ccc; padding: 10px 6px;  vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">単語覚え</span><br>30個は前日の復習<br>30個は新しい単語</td>
        </tr>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day">木</span></th>
            <td id="cell-thu-800" style="border: 1px solid #ccc; padding: 10px 6px;  vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">単語覚え</span><br>30個は前日の復習<br>30個は新しい単語</td>
        </tr>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day">金</span></th>
            <td id="cell-fri-800" style="border: 1px solid #ccc; padding: 10px 6px;  vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">単語覚え</span><br>30個は前日の復習<br>30個は新しい単語</td>
        </tr>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day calender_text_red">土</span></th>
            <td id="cell-sat-800" style="border: 1px solid #ccc; padding: 10px 6px;  vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">テスト</span><br>勉強した中から<br>100問テスト</td>
        </tr>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day calender_text_red">日</span></th>
            <td id="cell-sun-800" style="border: 1px solid #ccc; padding: 10px 6px;  vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">テスト</span><br>勉強した中から<br>100問テスト</td>
        </tr>
    </tbody>
</table>
`,
            `
<table style="width: 100%; border-collapse: collapse; text-align: center; margin-top: 10px;">
    <thead>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle; width: 1%; white-space: nowrap;"></th>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle; width: 50%;"><span class="calender_bgc calender_bgc_1000">501~</span><br>1週間で150個<br>17日で500個</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day">月</span></th>
            <td id="cell-mon-800" style="border: 1px solid #ccc; padding: 10px 6px;  vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">単語覚え</span><br>30個は前日の復習<br>30個は新しい単語</td>
        </tr>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day">火</span></th>
            <td id="cell-tue-800" style="border: 1px solid #ccc; padding: 10px 6px;  vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">単語覚え</span><br>30個は前日の復習<br>30個は新しい単語</td>
        </tr>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day">水</span></th>
            <td id="cell-wed-800" style="border: 1px solid #ccc; padding: 10px 6px;  vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">単語覚え</span><br>30個は前日の復習<br>30個は新しい単語</td>
        </tr>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day">木</span></th>
            <td id="cell-thu-800" style="border: 1px solid #ccc; padding: 10px 6px;  vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">単語覚え</span><br>30個は前日の復習<br>30個は新しい単語</td>
        </tr>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day">金</span></th>
            <td id="cell-fri-800" style="border: 1px solid #ccc; padding: 10px 6px;  vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">単語覚え</span><br>30個は前日の復習<br>30個は新しい単語</td>
        </tr>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day calender_text_red">土</span></th>
            <td id="cell-sat-800" style="border: 1px solid #ccc; padding: 10px 6px;  vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">テスト</span><br>勉強した中から<br>100問テスト</td>
        </tr>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day calender_text_red">日</span></th>
            <td id="cell-sun-800" style="border: 1px solid #ccc; padding: 10px 6px;  vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">テスト</span><br>勉強した中から<br>100問テスト</td>
        </tr>
    </tbody>
</table>
`,
            `
<table style="width: 100%; border-collapse: collapse; text-align: center; margin-top: 10px;">
    <thead>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle; width: 1%; white-space: nowrap;"></th>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle; width: 50%;"><span class="calender_bgc calender_bgc_1000">~1000</span><br>1週間で210個<br>1ヶ月で840個</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day">月</span></th>
            <td id="cell-mon-800" style="border: 1px solid #ccc; padding: 10px 6px;  vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">単語覚え</span><br>30個は前日の復習<br>30個は新しい単語<br><span class="calender_bgc calender_bgc_tag">テスト</span><br>50問テスト：<span class="calender_text_yellow">毎日異なる50問</span><br>復習テスト：前日の間違い全問</td>
        </tr>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day">火</span></th>
            <td id="cell-tue-800" style="border: 1px solid #ccc; padding: 10px 6px;  vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">単語覚え</span><br>30個は前日の復習<br>30個は新しい単語<br><span class="calender_bgc calender_bgc_tag">テスト</span><br>50問テスト：<span class="calender_text_yellow">毎日異なる50問</span><br>復習テスト：前日の間違い全問</td>
        </tr>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day">水</span></th>
            <td id="cell-wed-800" style="border: 1px solid #ccc; padding: 10px 6px;  vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">単語覚え</span><br>30個は前日の復習<br>30個は新しい単語<br><span class="calender_bgc calender_bgc_tag">テスト</span><br>50問テスト：<span class="calender_text_yellow">毎日異なる50問</span><br>復習テスト：前日の間違い全問</td>
        </tr>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day">木</span></th>
            <td id="cell-thu-800" style="border: 1px solid #ccc; padding: 10px 6px;  vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">単語覚え</span><br>30個は前日の復習<br>30個は新しい単語<br><span class="calender_bgc calender_bgc_tag">テスト</span><br>50問テスト：<span class="calender_text_yellow">毎日異なる50問</span><br>復習テスト：前日の間違い全問</td>
        </tr>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day">金</span></th>
            <td id="cell-fri-800" style="border: 1px solid #ccc; padding: 10px 6px;  vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">単語覚え</span><br>30個は前日の復習<br>30個は新しい単語<br><span class="calender_bgc calender_bgc_tag">テスト</span><br>50問テスト：<span class="calender_text_yellow">毎日異なる50問</span><br>復習テスト：前日の間違い全問</td>
        </tr>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day calender_text_red">土</span></th>
            <td id="cell-sat-800" style="border: 1px solid #ccc; padding: 10px 6px;  vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">単語覚え</span><br>30個は前日の復習<br>30個は新しい単語<br><span class="calender_bgc calender_bgc_tag">テスト</span><br>50問テスト：<span class="calender_text_yellow">毎日異なる50問</span><br>復習テスト：前日の間違い全問</td>
        </tr>
        <tr>
            <th style="border: 1px solid #ccc; padding: 10px 6px; text-align: center; vertical-align: middle;"><span class="calender_day calender_text_red">日</span></th>
            <td id="cell-sun-800" style="border: 1px solid #ccc; padding: 10px 6px;  vertical-align: middle;"><span class="calender_bgc calender_bgc_tag">単語覚え</span><br>30個は前日の復習<br>30個は新しい単語<br><span class="calender_bgc calender_bgc_tag">テスト</span><br>50問テスト：<span class="calender_text_yellow">毎日異なる50問</span><br>復習テスト：前日の間違い全問</td>
        </tr>
    </tbody>
</table>
`,
            '今後更新',
            '今後更新',
            '今後更新',
            '今後更新',],

        ['<span class="calender_bgc calender_bgc_tag">ペース</span><br>文法問題を30問<br>語法・イディオム問題を30問<br>この2つを並行して勉強していく。<br>1ヶ月で最低1周のペースをキープ。<br><span class="calender_bgc calender_bgc_tag">重要なこと</span><br>間違えた問題には付箋を貼って時間があるときに数問でもいいので、見返して復習すること。<br>とにかく間違えた問題は何度も見直して、その問題を視覚的に脳に刻み込むイメージで勉強すること。',
            '<span class="calender_bgc calender_bgc_tag">ペース</span><br>文法問題を30問<br>語法・イディオム問題を30問<br>この2つを並行して勉強していく。<br>1ヶ月で最低1周のペースをキープ。<br><span class="calender_bgc calender_bgc_tag">重要なこと</span><br>間違えた問題には付箋を貼って時間があるときに数問でもいいので、見返して復習すること。<br>とにかく間違えた問題は何度も見直して、その問題を視覚的に脳に刻み込むイメージで勉強すること。',
            '<span class="calender_bgc calender_bgc_tag">ペース</span><br>文法問題を30問<br>語法・イディオム問題を30問<br>この2つを並行して勉強していく。<br>1ヶ月で最低1周のペースをキープ。<br><span class="calender_bgc calender_bgc_tag">重要なこと</span><br>間違えた問題には付箋を貼って時間があるときに数問でもいいので、見返して復習すること。<br>とにかく間違えた問題は何度も見直して、その問題を視覚的に脳に刻み込むイメージで勉強すること。',
            '<span class="calender_bgc calender_bgc_tag">ペース</span><br>文法問題を30問<br>語法・イディオム問題を30問<br>この2つを並行して勉強していく。<br>1ヶ月で最低1周のペースをキープ。<br><span class="calender_bgc calender_bgc_tag">重要なこと</span><br>間違えた問題には付箋を貼って時間があるときに数問でもいいので、見返して復習すること。<br>とにかく間違えた問題は何度も見直して、その問題を視覚的に脳に刻み込むイメージで勉強すること。',
            '今後更新',
            '今後更新',
            '今後更新',
            '今後更新'],

        ['まだ長文の勉強はしない。',
            'まだ長文の勉強はしない。',
            '<span class="calender_bgc calender_bgc_tag">300語・500語</span><br>300語・500語程度の長文問題を週に1題ずつ解いていく。<br><span class="calender_bgc calender_bgc_tag">丁寧に読み解く</span><br>時間は気にせず、1文ずつ丁寧に解く。正解することよりも文・段落・文章レベルで構造を理解することが重要。<br><span class="calender_bgc calender_bgc_tag">必ず音読する</span><br>自分が文の意味を理解できる速さで音読する。この練習を繰り返すことで、読解のスピードも上がっていく。',
            '<span class="calender_bgc calender_bgc_tag">300語・500語</span><br>300語・500語程度の長文問題を週に1題ずつ解いていく。<br><span class="calender_bgc calender_bgc_tag">丁寧に読み解く</span><br>時間は気にせず、1文ずつ丁寧に解く。正解することよりも文・段落・文章レベルで構造を理解することが重要。<br><span class="calender_bgc calender_bgc_tag">必ず音読する</span><br>自分が文の意味を理解できる速さで音読する。この練習を繰り返すことで、読解のスピードも上がっていく。',
            '今後更新',
            '今後更新',
            '今後更新',
            '今後更新']
    ];

    const popupThemes = [
        { color: '#007bff', shadow: '0 0 20px rgba(0, 123, 255, 0.5), inset 0 0 20px rgba(0, 123, 255, 0.2)' },
        { color: '#ffd700', shadow: '0 0 20px rgba(255, 215, 0, 0.5), inset 0 0 20px rgba(255, 215, 0, 0.2)' },
        { color: '#ff0000', shadow: '0 0 20px rgba(255, 0, 0, 0.5), inset 0 0 20px rgba(255, 0, 0, 0.2)' },
        { color: '#008000', shadow: '0 0 20px rgba(0, 128, 0, 0.5), inset 0 0 20px rgba(0, 128, 0, 0.2)' }
    ];

    // ポップアップ要素の作成
    const popupOverlay = document.createElement('div');
    popupOverlay.style.position = 'fixed';
    popupOverlay.style.top = '0';
    popupOverlay.style.left = '0';
    popupOverlay.style.width = '100vw';
    popupOverlay.style.height = '100vh';
    popupOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
    popupOverlay.style.zIndex = '9999';
    popupOverlay.style.display = 'none';
    popupOverlay.style.opacity = '0';
    popupOverlay.style.transition = 'opacity 0.4s ease';

    const popupContent = document.createElement('div');
    popupContent.className = 'cyber-popup';
    popupContent.style.position = 'fixed';
    popupContent.style.backgroundColor = '#000000';
    popupContent.style.color = '#ffffff';
    popupContent.style.padding = '40px 20px 20px 20px';
    popupContent.style.borderRadius = '8px';
    popupContent.style.boxSizing = 'border-box';
    popupContent.style.overflow = 'auto';

    const popupText = document.createElement('div');
    popupText.style.opacity = '0';
    popupText.style.transition = 'opacity 0.3s ease 0.3s';

    popupContent.appendChild(popupText);
    popupOverlay.appendChild(popupContent);
    document.body.appendChild(popupOverlay);

    // 要素外（オーバーレイ）タップ時の動作
    popupOverlay.onclick = (e) => {
        if (e.target === popupOverlay) {
            document.body.style.paddingRight = '';
            document.body.style.overflow = '';
            popupOverlay.style.opacity = '0';
            popupContent.style.transition = 'all 0.4s cubic-bezier(0.1, 0.9, 0.2, 1)';
            popupContent.style.top = popupContent.dataset.originTop;
            popupContent.style.left = popupContent.dataset.originLeft;
            popupContent.style.width = popupContent.dataset.originWidth;
            popupContent.style.height = popupContent.dataset.originHeight;
            popupText.style.opacity = '0';

            setTimeout(() => {
                popupOverlay.style.display = 'none';
            }, 400);
        }
    };

    let isPage2 = false;
    let activeRow = null;
    let activeCol = null;

    function renderTable() {
        table.innerHTML = '';
        const isPC = window.matchMedia('(min-width: 768px)').matches;
        const currentMonths = isPage2 ? monthsPage2 : monthsPage1;
        const colOffset = isPage2 ? 4 : 0;

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');

        const thCorner = document.createElement('th');
        thCorner.style.border = '1px solid #ccc';
        thCorner.style.padding = '8px';
        thCorner.style.textAlign = 'center';
        thCorner.style.width = 'max-content';
        thCorner.style.whiteSpace = 'nowrap';

        const btnToggle = document.createElement('button');
        btnToggle.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;"><polyline points="9 18 15 12 9 6"></polyline></svg>';
        btnToggle.style.transition = 'transform 0.3s ease';
        btnToggle.style.backgroundColor = 'white';
        btnToggle.style.border = 'none';
        btnToggle.style.borderRadius = '6px';
        btnToggle.style.padding = '6px';
        btnToggle.style.cursor = 'pointer';
        btnToggle.style.color = '#121212';

        btnToggle.style.transform = isPage2 ? 'rotate(0deg)' : 'rotate(180deg)';
        btnToggle.onclick = (e) => {
            e.stopPropagation();
            isPage2 = !isPage2;
            renderTable();
        };

        requestAnimationFrame(() => {
            btnToggle.style.transform = isPage2 ? 'rotate(180deg)' : 'rotate(0deg)';
        });

        thCorner.appendChild(btnToggle);
        headerRow.appendChild(thCorner);

        currentMonths.forEach((m, i) => {
            const th = document.createElement('th');
            th.innerHTML = m;
            th.style.border = '1px solid #ccc';
            th.style.padding = '8px';
            th.style.cursor = 'pointer';
            th.style.width = '22%';
            th.style.fontSize = isPC ? '16px' : '12px';
            th.style.textAlign = 'center';
            th.style.verticalAlign = 'middle';
            th.onclick = (e) => highlightColumn(i, e);
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        rows.forEach((rowName, rIdx) => {
            const tr = document.createElement('tr');
            const thRow = document.createElement('th');
            thRow.innerHTML = rowName;
            thRow.style.border = '1px solid #ccc';
            thRow.style.padding = '4px';
            thRow.style.cursor = 'pointer';
            thRow.style.textAlign = 'center';
            thRow.style.verticalAlign = 'middle';
            thRow.style.fontSize = isPC ? '16px' : '12px';
            thRow.style.whiteSpace = 'nowrap';
            thRow.onclick = (e) => highlightRow(rIdx, e);
            tr.appendChild(thRow);

            for (let i = 0; i < 4; i++) {
                const td = document.createElement('td');
                const dataIndex = colOffset + i;
                td.innerHTML = cellData[rIdx][dataIndex];
                td.style.border = '1px solid #ccc';
                td.style.padding = '8px 4px';
                td.style.textAlign = 'center';
                td.style.fontSize = isPC ? '14px' : '10px';
                td.style.cursor = 'pointer';

                // tdクリック時のポップアップ処理
                td.onclick = (e) => {
                    e.stopPropagation();
                    const rect = td.getBoundingClientRect();

                    const isDevicePC = window.matchMedia('(min-width: 768px)').matches;

                    // ① 下にある要素のスクロールを禁止し、スクロールバー消失によるガタつきを防ぐ
                    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
                    document.body.style.paddingRight = scrollbarWidth + 'px';
                    document.body.style.overflow = 'hidden';

                    // ③, ④ スマホ・タブレット・PCに応じた最適なサイズ設定
                    popupContent.style.fontSize = isDevicePC ? '16px' : '12px';
                    popupContent.style.padding = isDevicePC ? '30px' : '15px';

                    // テーマカラーの適用とスクロールバーの色の連動
                    popupContent.style.border = `1px solid ${popupThemes[rIdx].color}`;
                    popupContent.style.boxShadow = popupThemes[rIdx].shadow;
                    popupContent.style.setProperty('--popup-theme-color', popupThemes[rIdx].color);

                    // 中身のセット
                    popupText.innerHTML = popupData[rIdx][dataIndex] || '';
                    popupText.style.opacity = '0';

                    // ② 高さを中の要素に依存させるための事前計測処理
                    const targetWidth = window.innerWidth * 0.8;
                    popupContent.style.transition = 'none';
                    popupContent.style.width = targetWidth + 'px';
                    popupContent.style.height = 'auto';
                    popupOverlay.style.display = 'block';

                    // 内容に応じた高さと、画面に収まらない場合の最大高さ（90vh）を計算
                    const autoHeight = popupContent.offsetHeight;
                    const maxHeight = window.innerHeight * 0.9;
                    const targetHeight = Math.min(autoHeight, maxHeight);

                    // アニメーション開始前の初期状態（tdと同じ位置・サイズ）をセット
                    popupContent.style.top = rect.top + 'px';
                    popupContent.style.left = rect.left + 'px';
                    popupContent.style.width = rect.width + 'px';
                    popupContent.style.height = rect.height + 'px';

                    // 戻る時のために位置を記憶
                    popupContent.dataset.originTop = rect.top + 'px';
                    popupContent.dataset.originLeft = rect.left + 'px';
                    popupContent.dataset.originWidth = rect.width + 'px';
                    popupContent.dataset.originHeight = rect.height + 'px';

                    // reflowさせてからアニメーションを開始
                    void popupContent.offsetWidth;

                    popupOverlay.style.opacity = '1';
                    popupContent.style.transition = 'all 0.4s cubic-bezier(0.1, 0.9, 0.2, 1)';

                    // 画面中央にサイバティックに拡大表示（高さは内容依存）
                    const targetLeft = (window.innerWidth - targetWidth) / 2;
                    const targetTop = (window.innerHeight - targetHeight) / 2;

                    popupContent.style.top = targetTop + 'px';
                    popupContent.style.left = targetLeft + 'px';
                    popupContent.style.width = targetWidth + 'px';
                    popupContent.style.height = targetHeight + 'px';

                    popupText.style.opacity = '1';
                };

                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
    }

    function clearHighlight() {
        const cells = table.querySelectorAll('th, td');
        cells.forEach(cell => {
            cell.style.backgroundColor = 'transparent';
        });
        activeRow = null;
        activeCol = null;
    }

    function highlightRow(rIdx, event) {
        if (event) event.stopPropagation();
        if (activeRow === rIdx) {
            clearHighlight();
            return;
        }
        clearHighlight();
        activeRow = rIdx;
        const tr = table.querySelectorAll('tbody tr')[rIdx];
        if (tr) {
            const cells = tr.querySelectorAll('th, td');
            cells.forEach(cell => {
                // 行インデックスに対応する色を適用
                cell.style.backgroundColor = rowColors[rIdx];
            });
        }
    }

    function highlightColumn(cIdx, event) {
        if (event) event.stopPropagation();
        if (activeCol === cIdx) {
            clearHighlight();
            return;
        }
        clearHighlight();
        activeCol = cIdx;
        const th = table.querySelectorAll('thead th')[cIdx + 1];
        if (th) th.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
        const tbodyRows = table.querySelectorAll('tbody tr');
        tbodyRows.forEach(tr => {
            const td = tr.querySelectorAll('td')[cIdx];
            if (td) td.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
        });
    }

    // リサイズ時に表示中のポップアップのサイズと位置を再計算
    window.addEventListener('resize', () => {
        if (popupOverlay.style.display === 'block') {
            const isDevicePC = window.matchMedia('(min-width: 768px)').matches;

            // リサイズ中はアニメーションを無効化して追従性を上げる
            popupContent.style.transition = 'none';

            popupContent.style.fontSize = isDevicePC ? '16px' : '14px';
            popupContent.style.padding = isDevicePC ? '40px 30px 30px 30px' : '30px 15px 15px 15px';

            const targetWidth = window.innerWidth * 0.8;
            popupContent.style.width = targetWidth + 'px';
            popupContent.style.height = 'auto'; // 高さを再計算するために一旦autoに戻す

            const autoHeight = popupContent.offsetHeight;
            const maxHeight = window.innerHeight * 0.9;
            const targetHeight = Math.min(autoHeight, maxHeight);

            const targetLeft = (window.innerWidth - targetWidth) / 2;
            const targetTop = (window.innerHeight - targetHeight) / 2;

            popupContent.style.top = targetTop + 'px';
            popupContent.style.left = targetLeft + 'px';
            popupContent.style.width = targetWidth + 'px';
            popupContent.style.height = targetHeight + 'px';
        }
    });

    document.addEventListener('click', () => {
        clearHighlight();
    });

    window.matchMedia('(min-width: 768px)').addEventListener('change', () => {
        renderTable();
    });

    renderTable();
    tableWrapper.appendChild(table);
    calendarEntry.appendChild(tableWrapper);
    // === カレンダー表エントリの作成ここまで ===


    // === ここから元のエントリの作成 ===
    const entry = document.createElement('div');
    entry.className = 'entry';

    const head = document.createElement('div');
    head.className = 'head';
    head.id = 'head';
    head.textContent = '現代英語に関わるさまざまな言語';

    entry.appendChild(head);

    const treeWrapper = document.createElement('div');
    treeWrapper.style.width = '100%';
    treeWrapper.innerHTML = `
        <svg viewBox="0 0 960 760" style="width: 100%; height: auto; display: block; margin: 15px 0;">
            <g stroke="currentColor" stroke-width="1.5" fill="none">
                <path d="M 40 380 L 160 380" />
                <path d="M 160 180 L 160 580" />
                
                <path d="M 160 180 L 320 180" />
                <path d="M 320 80 L 320 280" />
                <path d="M 320 80 L 940 80" />                <path d="M 320 180 L 940 180" />                <path d="M 320 280 L 460 280" />                                <path d="M 160 380 L 620 380" />                                <path d="M 160 580 L 320 580" />
                <path d="M 320 480 L 320 580" />
                <path d="M 320 480 L 940 480" />                <path d="M 320 580 L 780 580" />                
                                <path d="M 480 580 L 480 680" />
                <path d="M 480 680 L 780 680" />            </g>
            <g fill="currentColor" text-anchor="middle" font-family="sans-serif">
                                <g font-size="20">
                    <text x="80" y="372" font-weight="bold">印欧祖語</text>
                    
                    <text x="240" y="172">ゲルマン祖語</text>
                    <text x="240" y="372">古代ギリシャ語</text>
                    <text x="240" y="572">原始イタリック語</text>
                    
                    <text x="400" y="72">フランク語</text>
                    <text x="400" y="172">古英語</text>
                    <text x="400" y="272">古ノルド語</text>
                    <text x="400" y="372">古典ギリシャ語</text>
                    <text x="400" y="472">古典ラテン語</text>
                    <text x="400" y="572">俗ラテン語</text>

                    <text x="560" y="172">中英語</text>
                    <text x="560" y="372">中世ギリシャ語</text>
                    <text x="560" y="472">後期ラテン語</text>
                    <text x="560" y="572">古フランス語</text>

                    <text x="720" y="172">近代英語</text>
                    <text x="720" y="472">中世ラテン語</text>
                    <text x="720" y="572">フランス語</text>
                    <text x="720" y="672">イタリア語</text>

                    <text x="880" y="72">オランダ語</text>
                    <text x="880" y="172">現代英語</text>
                    <text x="880" y="472">近代ラテン語</text>
                </g>
                <g font-size="17" fill="#a0a0a0">
                    <text x="240" y="206">（原始ゲルマン語）</text>
                    <text x="240" y="406">前9c.～前4c.</text>
                    <text x="240" y="606">前2千年紀～前1千年紀</text>
                    
                    <text x="400" y="106">5c.～9c.</text>
                    <text x="400" y="206">450年～1100年</text>
                    <text x="400" y="306">700年～1350年</text>
                    <text x="400" y="406">前5c.～前4c.</text>
                    <text x="400" y="506">前1c.～3c.</text>
                    <text x="400" y="606">前1c.～9c.</text>

                    <text x="560" y="206">1100年～1500年</text>
                    <text x="560" y="406">4c.～15c.</text>
                    <text x="560" y="506">3c.～6c.</text>
                    <text x="560" y="606">9c.～14c.</text>

                    <text x="720" y="206">1500年～1900年</text>
                    <text x="720" y="506">7c.～15c.</text>
                    <text x="720" y="606">14c.～現代</text>
                    <text x="720" y="706">14c.～現代</text>

                    <text x="880" y="206">1900年～現代</text>
                    <text x="880" y="506">16c.～現代</text>
                </g>
            </g>
        </svg>
    `;
    entry.appendChild(treeWrapper);

    const explanations = document.createElement('div');
    explanations.style.margin = '15px 0';
    explanations.style.lineHeight = '1.6';
    explanations.style.fontSize = '14px';
    explanations.innerHTML = `
  <ul style="list-style-type: none; padding-left: 17px;">
        <li style="margin-bottom: 16px;">
            <strong style="display: block; margin-bottom: 4px; background: linear-gradient(transparent 75%, rgba(0, 164, 183, 0.7) 75%); width: fit-content;">印欧祖語</strong>
            <div style="padding-left: 1em;">ヨーロッパからインドに至る多数の言語の共通の祖先と推定される言語。文字記録はなく、比較言語学を用いて理論的に再建されている。</div>
        </li>
        <li style="margin-bottom: 16px;">
            <strong style="display: block; margin-bottom: 4px; background: linear-gradient(transparent 75%, rgba(0, 164, 183, 0.7) 75%); width: fit-content;">ゲルマン祖語</strong>
            <div style="padding-left: 1em;">英語、ドイツ語、北欧諸語などゲルマン語派の共通祖先。紀元前1千年紀ごろに話されていたとされ、現在のゲルマン系言語の基礎となっている。</div>
        </li>
        <li style="margin-bottom: 16px;">
            <strong style="display: block; margin-bottom: 4px; background: linear-gradient(transparent 75%, rgba(0, 164, 183, 0.7) 75%); width: fit-content;">ギリシャ語</strong>
            <div style="padding-left: 1em;">古代から現代まで数千年にわたり記録が途切れることなく残る言語。西洋の哲学、科学、文学、そして学術用語に極めて大きな影響を与えた。</div>
        </li>
        <li style="margin-bottom: 16px;">
            <strong style="display: block; margin-bottom: 4px; background: linear-gradient(transparent 75%, rgba(0, 164, 183, 0.7) 75%); width: fit-content;">ラテン語</strong>
            <div style="padding-left: 1em;">古代ローマ帝国の公用語であり、フランス語やイタリア語などロマンス諸語の祖先。中世以降もヨーロッパの学問・宗教における共通語として機能し続けた。</div>
        </li>
        <li style="margin-bottom: 16px;">
            <strong style="display: block; margin-bottom: 4px; background: linear-gradient(transparent 75%, rgba(0, 164, 183, 0.7) 75%); width: fit-content;">古ノルド語</strong>
            <div style="padding-left: 1em;">ヴァイキング時代から中世にかけて、主にスカンディナヴィア周辺で話されていた北ゲルマン語。現代のノルウェー語、スウェーデン語、デンマーク語などの直接の祖先。</div>
        </li>
        <li style="margin-bottom: 16px;">
            <strong style="display: block; margin-bottom: 4px; background: linear-gradient(transparent 75%, rgba(0, 164, 183, 0.7) 75%); width: fit-content;">フランク語</strong>
            <div style="padding-left: 1em;">古代後期から中世初期にかけてフランク人によって話されていた西ゲルマン語。古フランス語の語彙や発音に多大な影響を与え、現代のオランダ語などフランケン語群の基礎となった。</div>
        </li>
    </ul>
    `;
    entry.appendChild(explanations);

    results.prepend(entry);
    results.prepend(calendarEntry);
}