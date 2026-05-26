# KICK Log Tool

KICK Log Toolは、Kick.comのチャット欄でユーザー名にカーソルを置くと、そのユーザーの直近コメント履歴を表示するChrome拡張機能です。

[ZIPファイルをダウンロード](https://github.com/benicnst/KICK-Log-Tool/releases/latest/download/KICK-Log-Tool.zip)

KICK Log Tool is a Chrome extension that shows recent chat history for a Kick.com chat user when you hover over their username.

This project is not affiliated with, endorsed by, or sponsored by Kick.

## 日本語

### 主な機能

- チャット欄のユーザー名にマウスオーバーすると、そのユーザーの直近コメントを最大20件表示します。
- 配信情報を取得できる場合、履歴は同一配信内に限定します。
- チャット履歴はページを開いている間だけ保持し、ページを閉じる時に保存済み履歴を削除します。
- 最大3人までポップアップを固定できます。
- 固定したポップアップは画面上の好きな場所へドラッグできます。
- レイドなどで別チャンネルへ移動した場合、固定ポップアップと一時履歴を自動で閉じます。
- 表示中または固定中のユーザーに新しいコメントが追加された場合、ポップアップ内容を更新します。
- 通常の新着コメントはKickチャット欄のDOM監視でリアルタイム取得します。
- コメントがリアルタイムに追加されたと判断できる場合、DOMに時刻が無くても取得時刻を投稿時刻として扱います。
- チャット一時停止中のみ、固定中ユーザーの取りこぼしを減らすために限定的な非公式API確認を行います。
- チャット一時停止を解除すると、API確認ではなくチャット表示欄のリアルタイム取得に戻ります。
- API確認中は固定ユーザー名の横に回転するリロードマークを表示します。
- 複数の不審な投稿パターンに該当した場合、ユーザー名横にドクロマークを表示します。
- ドクロマーク判定時の動作を、通知だけ・一時表示・自動固定・オフから選べます。
- ウォッチリスト、無視リスト、配信者リストを設定できます。
- 検出数を拡張機能アイコンのバッジに表示します。
- 拡張機能アイコンをクリックすると、検出されたアカウント一覧と設定を確認できます。
- 任意でモデレーション用コマンドボタンを表示できます。初期状態では非表示です。

### Chromeへのインストール方法

1. 上のリンクからZIPファイルをダウンロードして展開します。開発者はこのリポジトリをcloneしても構いません。
2. Chromeで`chrome://extensions/`を開きます。
3. 右上のデベロッパーモードをオンにします。
4. 「パッケージ化されていない拡張機能を読み込む」をクリックします。
5. `manifest.json`が入っているフォルダを選択します。
6. Kick.comの配信ページを開くか、すでに開いている場合は再読み込みします。

ファイルを更新した後は、`chrome://extensions/`で拡張機能を再読み込みし、Kickページも再読み込みしてください。

### Edge / Braveへのインストール方法

EdgeとBraveもChromium系ブラウザのため、未パッケージ拡張機能を読み込めます。

1. ブラウザの拡張機能ページを開きます。
2. デベロッパーモードをオンにします。
3. このプロジェクトフォルダを未パッケージ拡張機能として読み込みます。
4. Kickページを再読み込みします。

### 使い方

- チャット欄のユーザー名にカーソルを置くと履歴ポップアップが開きます。
- 履歴ポップアップ内のアカウントIDをクリックすると、そのKickアカウントページを新規タブで開きます。
- 「固定」を押すとポップアップを固定できます。
- 固定ポップアップはヘッダー部分をドラッグして移動できます。
- 閉じるボタンで固定ポップアップを閉じられます。
- 拡張機能アイコンの数字は、現在のKickタブでドクロ判定されたアカウント数です。
- 拡張機能アイコンをクリックすると検出一覧と設定を表示します。
- 検出一覧のアカウント名をクリックすると、そのKickアカウントページを新規タブで開きます。
- 検出一覧の`クリア`を押すと、現在のKickタブの検出一覧とバッジを消します。
- ドクロ判定時の動作は`通知だけ`、`一時表示`、`自動固定`、`オフ`から選べます。
- ウォッチリストに登録したIDがコメントすると検出一覧へ表示します。
- 無視リストに登録したIDはドクロ判定、自動表示、自動固定の対象外になります。
- 配信者リストにフォロー中の配信者IDを登録すると、そのIDのコメントを検出します。
- チャットがスクロールで一時停止している間だけ、固定ユーザーの新着確認に限定API確認を使います。
- チャット一時停止を解除すると、表示チャット欄のDOM監視によるリアルタイム取得に戻ります。
- リアルタイム取得で投稿時刻が取れない場合は、直近のKick APIと照合して投稿時刻への補正を試みます。

### ドクロマーク判定について

ドクロマークはBOTや連投ツールの使用を断定するものではありません。あくまで、投稿パターンが不自然な可能性を示す簡易的な目印です。

投稿時刻がAPI、ページ上の時刻情報、またはリアルタイム追加判定から取得できたコメントだけを判定に使います。投稿時刻が取れないコメントは「取得」時刻として区別して表示し、ドクロマーク判定には使いません。

以下の条件のうち、2つ以上に該当した場合のみドクロマークを表示します。

- 60秒以内に5件以上コメントしている。
- 120秒以内に8件以上コメントしている。
- 正規化後の同一コメントが3回以上ある。
- 正規化後の同一長文コメントが2回以上ある。
- 2秒以内に3件以上コメントしている。
- 10秒以内に5件以上コメントしている。
- 6件以上のコメントがあり、平均投稿間隔が8秒以下。
- URL風コメントが3件以上ある。
- 1コメント内で同じ語句を大量に繰り返している。
- 絵文字やスタンプ系の文字列を大量に投稿している。

ドクロマーク判定に該当したユーザーの動作は設定で変更できます。`自動固定`の場合、最大3人までポップアップ固定されます。閉じたユーザーは、その配信中は自動固定されません。手動でピン留めした場合は再び固定できます。

誤判定になり得る例:

- 実際の視聴者が短い返事を素早く複数回投稿した。
- Kick側の遅延でコメントがまとめて表示された。
- 配信者が同じフレーズの投稿を促した。
- 「w」「草」「おめ」などの短いリアクションを繰り返した。

ドクロマークは証拠ではなく、確認が必要なアカウントの目安として扱ってください。

### 任意のモデレーションボタン

モデレーション用ボタンは初期状態では非表示です。

表示したい場合は、Kickページのコンソールで以下を実行します。

```js
window.__KICK_CHAT_HISTORY_HOVER__.setModerationActionsEnabled(true)
```

ボタンはコマンドをチャット入力欄へ入れるだけで、自動送信はしません。

生成されるコマンド:

- `/timeout <username> 600 suspicious activity`
- `/ban <username> suspicious activity`

非表示に戻す場合:

```js
window.__KICK_CHAT_HISTORY_HOVER__.setModerationActionsEnabled(false)
```

### データとプライバシー

- このプロジェクトが管理する外部サーバーは使いません。
- 取得したチャット履歴は外部サーバーへ送信しません。
- ドクロ判定されたアカウント一覧も外部サーバーへ送信しません。
- ドクロ判定一覧はKickタブと拡張機能の内部メモリ上に保持され、永続保存はしません。
- `activeTab`権限は、拡張機能アイコンをクリックした時に現在のKickタブから検出一覧を取得するために使います。
- `storage`権限は、ドクロ判定時の動作、ウォッチリスト、無視リスト、配信者リストの設定保存に使います。
- ページを開いている間だけKickページ側の`localStorage`へ一時保存し、ページを閉じる時に削除します。
- 履歴補完、投稿時刻補正、チャット一時停止中の固定ユーザー確認のため、KickのAPIへ通信する場合があります。
- ユーザーごとの履歴は設定された最大件数までに制限されます。
- 投稿時刻が取得できないコメントは、取得時刻として区別して表示します。
- ログイントークンや個人情報の入力は不要です。

### APIについて

Kickには、この用途向けの安定した公開チャット履歴APIはありません。この拡張機能は、以下の場合に限定して非公式エンドポイントを使用します。

- 同一配信内の過去履歴補完。
- リアルタイム取得したコメントの投稿時刻補正。
- チャットがスクロールで一時停止している間の固定ユーザー確認。

不要な負荷を避けるため、APIアクセスは制限しています。

- ホバー時の履歴補完は、そのユーザーのAPI探索が未完了の場合のみ実行します。
- 履歴補完の探索範囲は最大240分、または同一配信の開始時刻までです。
- 固定ユーザー確認はチャット一時停止中のみ約15秒間隔で実行します。
- チャット一時停止を解除すると、固定ユーザー確認のAPI使用を停止します。

Kick側の仕様変更、認証状態、Cloudflare、CORS、レスポンス形式の変更によって、非公式APIによる取得は動作しなくなる可能性があります。

### リリース手順

配布用ZIPは以下で作成します。

```bash
scripts/package-release.sh
```

GitHub Releaseには、`dist/KICK-Log-Tool.zip`をアップロードしてください。このファイル名を毎回同じにすると、READMEのダウンロードリンクを変更せずに最新ReleaseのZIPへ誘導できます。

### 免責事項

- この拡張機能の利用は自己責任でお願いします。
- この拡張機能はKick公式ツールではありません。
- Kick側の仕様変更や利用環境によって、正しく動作しない場合があります。
- この拡張機能の利用によって発生した問題について、作者は責任を負いません。

### 連絡先

- X: [@Benicnst](https://x.com/Benicnst)

## English

### Features

- Shows up to the latest 20 captured comments for a hovered chat username.
- Keeps history scoped to the current livestream when stream context is available.
- Keeps chat history only while the page is open and clears saved history when the page is closed.
- Supports pinning up to 3 user popups.
- Pinned popups can be dragged anywhere on the screen.
- Automatically closes pinned popups and clears temporary history when moving to another channel, such as after a raid.
- Updates visible and pinned popups when new comments are captured.
- Uses Kick chat DOM observation for normal realtime updates.
- Treats capture time as posting time when messages are clearly added in realtime without a DOM timestamp.
- Uses a limited unofficial Kick chat API only while chat is paused, and only for pinned users.
- Returns to DOM-based realtime capture after chat pause is released.
- Shows a rotating reload icon next to pinned users while API checking is active.
- Shows a skull marker when multiple suspicious posting patterns are detected.
- Lets you choose the skull-marker action: notify only, temporary popup, auto-pin, or off.
- Supports a watchlist, ignore list, and broadcaster list.
- Shows the number of detected accounts on the extension icon badge.
- Shows all detected accounts and settings in the extension popup.
- Provides optional moderation command buttons, disabled by default.

### Install In Chrome

1. Download and extract the ZIP file from the link above. Developers can also clone this repository.
2. Open `chrome://extensions/`.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select the folder that contains `manifest.json`.
6. Open or reload a Kick.com livestream page.

After updating files, reload the extension from `chrome://extensions/` and reload the Kick page.

### Install In Edge Or Brave

Edge and Brave support unpacked Chromium extensions.

1. Open the browser's extensions page.
2. Enable developer mode.
3. Load this project folder as an unpacked extension.
4. Reload the Kick page.

### Usage

- Hover over a chat username to open the history popup.
- Click the account ID inside the history popup to open that Kick account page in a new tab.
- Click Fixed to pin the popup.
- Drag a pinned popup by its header.
- Close a pinned popup with the close button.
- The extension icon badge shows the number of detected accounts in the current Kick tab.
- Click the extension icon to open the detected-account list and settings.
- Click an account in the list to open that Kick account page in a new tab.
- Click `Clear` in the popup to clear the detected list and badge for the current Kick tab.
- Choose the skull-marker action from `Notify only`, `Temporary popup`, `Auto-pin`, or `Off`.
- Add IDs to the watchlist to detect comments from those accounts.
- Add IDs to the ignore list to exclude them from skull detection and automatic alerts.
- Add followed broadcaster IDs to the broadcaster list to detect their comments.
- When chat is paused by scrolling, pinned users are checked through the limited API refresh.
- When chat pause is released, realtime capture returns to the visible chat DOM.
- When realtime capture does not include a posting time, the extension tries to correct it by matching recent Kick API messages.

### Suspicious Account Marker

The skull marker is not a definitive bot judgment. It is only a heuristic warning that an account may be using automation or rapid-posting behavior.

Only comments with a posting time obtained from the Kick API, page timestamp data, or realtime-add detection are used for this check. Comments without an available posting time are labeled as captured time and are excluded from skull-marker detection.

The marker is shown only when 2 or more of these conditions are true:

- 5 or more comments within 60 seconds.
- 8 or more comments within 120 seconds.
- The same normalized comment appears 3 or more times.
- The same normalized long comment appears 2 or more times.
- 3 or more comments appear within 2 seconds.
- 5 or more comments appear within 10 seconds.
- The average interval between captured comments is 8 seconds or less, with at least 6 comments.
- 3 or more URL-like comments are detected.
- One comment contains heavy repeated phrases.
- A comment contains a large amount of emoji or emote-like content.

The action after a skull-marker match is configurable. In `Auto-pin` mode, up to 3 users are pinned automatically. If you close an automatically pinned user, it will not be auto-pinned again during that stream. You can still pin that user manually.

Examples that can still be false positives:

- A real viewer posts several short replies quickly.
- Kick delays comments and then renders them together.
- A streamer asks chat to repeat a phrase.
- A user posts repeated reactions such as short laughter or congratulations.

Treat the skull marker as a review hint, not proof.

### Optional Moderation Buttons

Moderation command buttons are hidden by default.

To show them for the current browser profile and site storage, run this in the Kick page console:

```js
window.__KICK_CHAT_HISTORY_HOVER__.setModerationActionsEnabled(true)
```

The buttons only insert commands into the chat input. They do not send automatically.

Generated commands:

- `/timeout <username> 600 suspicious activity`
- `/ban <username> suspicious activity`

To hide the buttons again:

```js
window.__KICK_CHAT_HISTORY_HOVER__.setModerationActionsEnabled(false)
```

### Data And Privacy

- The extension does not use an external server controlled by this project.
- Captured chat history is not sent to an external server.
- The detected account list is not sent to an external server.
- The detected-account list is kept only in the Kick tab and extension runtime memory, not persistent storage.
- The `activeTab` permission is used to read the detected-account list from the current Kick tab when you click the extension icon.
- The `storage` permission is used only to save extension settings such as alert action, watchlist, ignore list, and broadcaster list.
- It is temporarily stored in the Kick page's `localStorage` while the page is open and cleared when the page is closed.
- The extension may communicate with Kick APIs for history backfill, posting-time correction, and pinned-user checks while chat is paused.
- History is limited to the configured maximum number of messages per user.
- Comments without an available posting time are labeled as captured time.
- The extension does not require a login token or any user-provided personal information.

### API Behavior

Kick does not provide a stable public chat-history API for this use case. This extension uses limited unofficial endpoints for:

- Backfilling previous history within the same stream.
- Correcting posting times for realtime-captured comments.
- Checking pinned users while the Kick chat is paused because of scrolling.

API access is intentionally limited to reduce unnecessary load:

- Hover backfill is attempted only when API search for that user has not completed.
- Backfill search is capped at 240 minutes or the start time of the same stream.
- Pinned-user API checks run about every 15 seconds only while chat pause is detected.
- Pinned-user checks stop using the API once chat pause is released.

Unofficial API behavior can break if Kick changes its site, authentication, Cloudflare behavior, CORS behavior, or response format.

### Release Process

Create the distributable ZIP with:

```bash
scripts/package-release.sh
```

Upload `dist/KICK-Log-Tool.zip` to the GitHub Release. Keeping this asset filename the same for every release allows the README download link to always point to the latest release ZIP.

### Disclaimer

- Use this extension at your own risk.
- This extension is not an official Kick tool.
- It may stop working or behave unexpectedly if Kick changes its site or if your environment differs.
- The author is not responsible for any issues caused by using this extension.

### Contact

- X: [@Benicnst](https://x.com/Benicnst)

## Development

Validate the JavaScript and manifest before loading the extension:

```sh
node --check content.js
python3 -m json.tool manifest.json >/dev/null
```

## Notes

- This is an unpacked extension project.
- It is not published on the Chrome Web Store.
- Kick DOM changes may require selector updates in `content.js`.
