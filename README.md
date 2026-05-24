# KICK Log Tool

KICK Log Toolは、Kick.comのチャット欄でユーザー名にカーソルを置くと、そのユーザーの直近コメント履歴を表示するChrome拡張機能です。

[ZIPファイルをダウンロード](https://github.com/benicnst/KICK-Log-Tool/archive/refs/heads/main.zip)

KICK Log Tool is a Chrome extension that shows recent chat history for a Kick.com chat user when you hover over their username.

This project is not affiliated with, endorsed by, or sponsored by Kick.

## 日本語

### 主な機能

- チャット欄のユーザー名にマウスオーバーすると、そのユーザーの直近コメントを最大20件表示します。
- 配信情報を取得できる場合、履歴は同一配信内に限定します。
- チャット履歴はKickページ側の`localStorage`に保存します。
- 最大3人までポップアップを固定できます。
- 固定したポップアップは画面上の好きな場所へドラッグできます。
- 表示中または固定中のユーザーに新しいコメントが追加された場合、ポップアップ内容を更新します。
- 通常の新着コメントはKickチャット欄のDOM監視でリアルタイム取得します。
- チャット一時停止中のみ、固定中ユーザーの取りこぼしを減らすために限定的な非公式API確認を行います。
- チャット一時停止を解除すると、API確認ではなくチャット表示欄のリアルタイム取得に戻ります。
- API確認中は固定ユーザー名の横に回転するリロードマークを表示します。
- 複数の不審な投稿パターンに該当した場合、ユーザー名横にドクロマークを表示します。
- 任意でモデレーション用コマンドボタンを表示できます。初期状態では非表示です。

### Chromeへのインストール方法

1. このリポジトリをダウンロード、またはcloneします。
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
- 「固定」を押すとポップアップを固定できます。
- 固定ポップアップはヘッダー部分をドラッグして移動できます。
- 閉じるボタンで固定ポップアップを閉じられます。
- チャットがスクロールで一時停止している間だけ、固定ユーザーの新着確認に限定API確認を使います。
- チャット一時停止を解除すると、表示チャット欄のDOM監視によるリアルタイム取得に戻ります。

### ドクロマーク判定について

ドクロマークはBOTや連投ツールの使用を断定するものではありません。あくまで、投稿パターンが不自然な可能性を示す簡易的な目印です。

以下の条件のうち、2つ以上に該当した場合のみドクロマークを表示します。

- 60秒以内に5件以上コメントしている。
- 120秒以内に8件以上コメントしている。
- 正規化後の同一コメントが3回以上ある。
- 2秒以内に3件以上コメントしている。
- 6件以上のコメントがあり、平均投稿間隔が8秒以下。
- URL風コメントが3件以上ある。

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
- 取得したチャット履歴はKickページ側の`localStorage`に保存します。
- ユーザーごとの履歴は設定された最大件数までに制限されます。
- ログイントークンや個人情報の入力は不要です。

### APIについて

Kickには、この用途向けの安定した公開チャット履歴APIはありません。この拡張機能は、以下の場合に限定して非公式エンドポイントを使用します。

- ローカルで取得済みの履歴が20件未満の場合の履歴補完。
- チャットがスクロールで一時停止している間の固定ユーザー確認。

不要な負荷を避けるため、APIアクセスは制限しています。

- ホバー時の履歴補完は必要な場合のみ実行します。
- 固定ユーザー確認はチャット一時停止中のみ約15秒間隔で実行します。
- チャット一時停止を解除すると、固定ユーザー確認のAPI使用を停止します。

Kick側の仕様変更、認証状態、Cloudflare、CORS、レスポンス形式の変更によって、非公式APIによる取得は動作しなくなる可能性があります。

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
- Stores chat history in the Kick page's `localStorage`.
- Supports pinning up to 3 user popups.
- Pinned popups can be dragged anywhere on the screen.
- Updates visible and pinned popups when new comments are captured.
- Uses Kick chat DOM observation for normal realtime updates.
- Uses a limited unofficial Kick chat API only while chat is paused, and only for pinned users.
- Returns to DOM-based realtime capture after chat pause is released.
- Shows a rotating reload icon next to pinned users while API checking is active.
- Shows a skull marker when multiple suspicious posting patterns are detected.
- Provides optional moderation command buttons, disabled by default.

### Install In Chrome

1. Download or clone this repository.
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
- Click Fixed to pin the popup.
- Drag a pinned popup by its header.
- Close a pinned popup with the close button.
- When chat is paused by scrolling, pinned users are checked through the limited API refresh.
- When chat pause is released, realtime capture returns to the visible chat DOM.

### Suspicious Account Marker

The skull marker is not a definitive bot judgment. It is only a heuristic warning that an account may be using automation or rapid-posting behavior.

The marker is shown only when 2 or more of these conditions are true:

- 5 or more comments within 60 seconds.
- 8 or more comments within 120 seconds.
- The same normalized comment appears 3 or more times.
- 3 or more comments appear within 2 seconds.
- The average interval between captured comments is 8 seconds or less, with at least 6 comments.
- 3 or more URL-like comments are detected.

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
- Captured chat history is stored in the Kick page's `localStorage`.
- History is limited to the configured maximum number of messages per user.
- The extension does not require a login token or any user-provided personal information.

### API Behavior

Kick does not provide a stable public chat-history API for this use case. This extension uses limited unofficial endpoints for:

- Backfilling missing recent history when local captured history is under 20 comments.
- Checking pinned users while the Kick chat is paused because of scrolling.

API access is intentionally limited to reduce unnecessary load:

- Hover backfill is attempted only when needed.
- Pinned-user API checks run about every 15 seconds only while chat pause is detected.
- Pinned-user checks stop using the API once chat pause is released.

Unofficial API behavior can break if Kick changes its site, authentication, Cloudflare behavior, CORS behavior, or response format.

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
