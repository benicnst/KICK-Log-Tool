# KICK Log Tool

KICK Log Toolは、Kick.comのチャット欄でユーザー名にカーソルを置くと、そのユーザーの直近コメント履歴を表示するChrome拡張機能です。

[ZIPファイルをダウンロード](https://github.com/benicnst/KICK-Log-Tool/releases/latest/download/KICK-Log-Tool.zip)

KICK Log Tool is a Chrome extension that shows recent chat history for a Kick.com chat user when you hover over their username.

This project is not affiliated with, endorsed by, or sponsored by Kick.

## 日本語

### 主な機能

- チャット欄のユーザー名にマウスオーバーすると、そのユーザーの直近コメントをキャッシュ上限の範囲で表示します。
- 配信情報を取得できる場合、履歴は同一配信内に限定します。
- チャット履歴と検出一覧は同一配信ごとに一時保存し、リロードや誤って閉じた場合でも復元できます。
- 自動ポップアップ人数を0〜5人の範囲で設定できます。0人にすると自動表示を止められます。
- 固定したポップアップは画面上の好きな場所へドラッグできます。
- レイドなどで別チャンネルへ移動した場合、固定ポップアップと一時履歴を自動で閉じます。
- 表示中または固定中のユーザーに新しいコメントが追加された場合、ポップアップ内容を更新します。
- 通常の新着コメントはWebSocketを最優先でリアルタイム取得し、WebSocketが止まった時のみDOM監視へフォールバックします。
- コメントがリアルタイムに追加されたと判断できる場合、DOMに時刻が無くても取得時刻を投稿時刻として扱います。
- APIは配信を開いた時点より前の過去コメント補完、投稿時刻補正、フォロー中チャンネル同期に限定して使います。
- 過去コメント補完は配信閲覧開始前の最大60分を対象にします。
- 複数の不審な投稿パターンに該当した場合、ユーザー名横に検出種別アイコンを表示します。
- 検出時の動作を、通知だけ・自動ポップアップ・オフから選べます。
- ウォッチリスト、無視リスト、配信者リストを設定できます。
- ログイン中はフォロー中チャンネルを配信者リストへ自動で読み込み、失敗時は理由を表示します。
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
- ピンボタンを押すとポップアップを固定できます。
- 固定ポップアップはヘッダー部分をドラッグして移動できます。
- 固定中のピンボタンをもう一度押すと固定を解除できます。
- 拡張機能アイコンの数字は、現在のKickタブで検出アイコン判定されたアカウント数です。
- 拡張機能アイコンをクリックすると検出一覧と設定を表示します。
- 検出一覧のアカウント名または内容部分をクリックすると、そのアカウントの履歴ポップアップを固定します。
- 検出一覧の`クリア`を押すと、現在のKickタブの検出一覧とバッジを消します。
- 検出時の動作は`通知だけ`、`自動ポップアップ`、`オフ`から選べます。
- ウォッチリストに登録したIDがコメントすると検出一覧へ表示します。
- 無視リストに登録したIDは検出アイコン判定と自動ポップアップの対象外になります。
- 配信者リストに登録された配信者IDがコメントすると検出します。
- 配信者リストがONの場合、ログイン中のKickページでフォロー中チャンネルを自動同期します。
- フォロー中APIで取得できない場合は、ページ上に表示されているフォロー中欄を補助的に読み取ります。自動読み込みに失敗した場合は詳細設定内に理由を表示します。
- WebSocket取得が有効な間はWebSocketを最優先し、停止時のみDOM監視へフォールバックします。
- 固定中ユーザーのAPI補完は、リアルタイム取得分より過去コメントのみを対象にします。
- リアルタイム取得で投稿時刻が取れない場合は、直近のKick APIと照合して投稿時刻への補正を試みます。

### 検出アイコンについて

検出アイコンはBOT、連投ツール、個人情報投稿、危害予告などを断定するものではありません。あくまで、投稿パターンが不自然な可能性を示す簡易的な目印です。

投稿時刻がAPI、ページ上の時刻情報、またはリアルタイム追加判定から取得できたコメントだけを判定に使います。投稿時刻が取れないコメントは「取得」時刻として区別して表示し、検出判定には使いません。

原則として、スコアが閾値以上かつ複数条件に該当した場合に検出アイコンを表示します。個人情報投稿や危害予告などは強い検出要素として扱います。

- 正規化後の同一コメントが3回以上ある。
- 正規化後の同一長文コメントが2回以上ある。ただし単独では弱い補助材料として扱います。
- 1秒以内に3件以上コメントしている。
- 3秒以内に5件以上コメントしている。
- 12件以上のコメントがあり、平均投稿間隔が2.5秒以下。
- URL風コメントが3件以上ある。
- 1コメント内で同じ語句を大量に繰り返している。
- 複数アカウントが短時間に同じ文面を繰り返し投稿している。ただしエモート中心の短い投稿は対象外にします。
- 絵文字やスタンプ系の文字列を大量に投稿している。ただし、通常コメントもしているユーザーの少数のエモート投稿は強い判定材料にしません。
- 住所、電話番号、メールアドレスなど個人情報らしき投稿がある。
- 殺害や危害予告らしき投稿があり、スコアが高い。
- 攻撃的暴言は単発ではなく、直接的な表現が複数回ある場合だけ検出対象にします。

検出判定に該当したユーザーの動作は設定で変更できます。`自動ポップアップ`は検出時に履歴ポップアップを自動で開く動作です。自動ポップアップを固定解除したユーザーは、その配信中は再表示されません。

誤判定になり得る例:

- 実際の視聴者が短い返事を素早く複数回投稿した。
- Kick側の遅延でコメントがまとめて表示された。
- 配信者が同じフレーズの投稿を促した。
- 「w」「草」「おめ」などの短いリアクションを繰り返した。

検出アイコンは証拠ではなく、確認が必要なアカウントの目安として扱ってください。

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
- 検出アイコン判定されたアカウント一覧も外部サーバーへ送信しません。
- 検出アイコン判定一覧はKickタブと拡張機能の内部メモリ上に保持し、同一配信の復元用にKickページ側の`localStorage`へ一時保存します。
- `activeTab`権限は、拡張機能アイコンをクリックした時に現在のKickタブから検出一覧を取得するために使います。
- `storage`権限は、検出アイコン判定時の動作、ウォッチリスト、無視リスト、配信者リストの設定保存に使います。
- Kickページ側の`localStorage`へ一時保存し、同一配信の再表示に使います。古いキャッシュは時間経過や配信終了判定により削除対象になります。
- 履歴補完、投稿時刻補正、フォロー中チャンネルの自動同期のため、KickのAPIへ通信する場合があります。
- 履歴キャッシュは配信ごとの全体上限までに制限されます。
- 投稿時刻が取得できないコメントは、取得時刻として区別して表示します。
- ログイントークンや個人情報の入力は不要です。

### APIについて

Kickには、この用途向けの安定した公開チャット履歴APIはありません。この拡張機能は、以下の場合に限定して非公式エンドポイントを使用します。

- 配信閲覧開始前の同一配信内の過去履歴補完。
- リアルタイム取得したコメントの投稿時刻補正。
- フォロー中チャンネルの配信者リストへの自動同期。

不要な負荷を避けるため、APIアクセスは制限しています。

- API補完は配信閲覧開始前の最大60分、または同一配信の開始時刻までを対象にします。
- フォロー中チャンネルの自動同期は配信者リストがONの場合のみ実行し、短時間に連続実行しないよう制限しています。

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

- Shows captured comments for a hovered chat username within the stream cache limit.
- Keeps history scoped to the current livestream when stream context is available.
- Temporarily stores chat history and detections per livestream so they can be restored after a reload or accidental close.
- Lets you set the auto-popup limit from 0 to 5 users. Set it to 0 to disable automatic popups.
- Pinned popups can be dragged anywhere on the screen.
- Automatically closes pinned popups and clears temporary history when moving to another channel, such as after a raid.
- Updates visible and pinned popups when new comments are captured.
- Uses WebSocket as the primary realtime source and falls back to DOM observation only when WebSocket capture is not active.
- Treats capture time as posting time when messages are clearly added in realtime without a DOM timestamp.
- Uses limited Kick API access for pre-viewing history backfill, posting-time correction, and followed-channel sync.
- Backfills up to 60 minutes of same-stream comments from before the page was opened.
- Shows a detection-type icon when multiple suspicious posting patterns are detected.
- Lets you choose the detection action: notify only, auto popup, or off.
- Supports a watchlist, ignore list, and broadcaster list.
- Automatically syncs followed channels into the broadcaster list when logged in, and shows the failure reason when sync fails.
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
- Click the pin button to pin the popup.
- Drag a pinned popup by its header.
- Click the pin button again on a pinned popup to unpin it.
- The extension icon badge shows the number of detected accounts in the current Kick tab.
- Click the extension icon to open the detected-account list and settings.
- Click the account ID or content area in the list to pin that user's history popup.
- Click `Clear` in the popup to clear the detected list and badge for the current Kick tab.
- Choose the detection action from `Notify only`, `Auto popup`, or `Off`.
- Add IDs to the watchlist to detect comments from those accounts.
- Add IDs to the ignore list to exclude them from detection-icon checks and auto popups.
- Add broadcaster IDs to the broadcaster list to detect comments from those accounts.
- When the broadcaster list is enabled, followed channels are synced automatically on logged-in Kick pages.
- If the followed-channel API cannot be read, the extension falls back to the visible following section on the page. Failed sync attempts show a reason in settings.
- While WebSocket capture is active, WebSocket is prioritized and DOM capture is used only as fallback.
- API history backfill targets comments from before the page was opened.
- When realtime capture does not include a posting time, the extension tries to correct it by matching recent Kick API messages.

### Detection Icons

Detection icons are not definitive proof of bots, automation, personal-information posting, or threats. They are heuristic warnings for unusual posting patterns.

Only comments with a posting time obtained from the Kick API, page timestamp data, or realtime-add detection are used for this check. Comments without an available posting time are labeled as captured time and are excluded from detection.

The marker is shown when the risk score is high enough and multiple suspicious conditions are matched. Personal-information or violence-like content is treated as a strong signal.

- The same normalized comment appears 3 or more times.
- The same normalized long comment appears 2 or more times. This is treated only as a weak supporting signal by itself.
- 3 or more comments appear within 1 second.
- 5 or more comments appear within 3 seconds.
- The average interval between captured comments is 2.5 seconds or less, with at least 12 comments.
- 3 or more URL-like comments are detected.
- One comment contains heavy repeated phrases.
- Multiple accounts repeat the same message pattern in a short time window. Short emote-focused posts are excluded from this coordinated-spam rule.
- A comment contains a large amount of emoji or emote-like content. A few emote-only posts from a user who also posts normal comments are not treated as a strong signal.
- A comment appears to contain personal information such as an address, phone number, or email address.
- Threat-like comments score high enough.
- Abusive language is detected only when direct abusive expressions appear multiple times, not from a single light phrase.

The action after a detection match is configurable. `Auto popup` opens the history popup automatically when a match is detected. If you unpin an auto popup, it will not be auto-shown again during the same stream.

Examples that can still be false positives:

- A real viewer posts several short replies quickly.
- Kick delays comments and then renders them together.
- A streamer asks chat to repeat a phrase.
- A user posts repeated reactions such as short laughter or congratulations.

Treat detection icons as review hints, not proof.

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
- The detected-account list is kept in the Kick tab and extension runtime memory, and is temporarily stored in the Kick page's `localStorage` for same-stream restore.
- The `activeTab` permission is used to read the detected-account list from the current Kick tab when you click the extension icon.
- The `storage` permission is used only to save extension settings such as alert action, watchlist, ignore list, and broadcaster list.
- It is temporarily stored in the Kick page's `localStorage` and reused for the same livestream. Old cache is removed by age or when stream-ended state is confirmed.
- The extension may communicate with Kick APIs for history backfill, posting-time correction, and followed-channel sync.
- History is limited by the per-stream cache limit.
- Comments without an available posting time are labeled as captured time.
- The extension does not require a login token or any user-provided personal information.

### API Behavior

Kick does not provide a stable public chat-history API for this use case. This extension uses limited unofficial endpoints for:

- Backfilling same-stream history from before the page was opened.
- Correcting posting times for realtime-captured comments.
- Syncing followed channels into the broadcaster list.

API access is intentionally limited to reduce unnecessary load:

- API history backfill is capped at 60 minutes before page open, or the start time of the same stream.
- Followed-channel sync runs only when the broadcaster list is enabled and is rate-limited to avoid repeated requests.

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
