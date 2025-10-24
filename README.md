# OAuth Demo (Authorization Code + PKCE)

このリポジトリは Next.js 13+（App Router）で構築したミニマルな OAuth デモです。  
`server` が OAuth 認可サーバー、`client` がリライングパーティ（クライアント）として動作し、PKCE 付きの Authorization Code フローをローカル環境で確認できます。

## 構成

- `server/` : 認可・トークン・ユーザー情報エンドポイントを提供する OAuth サーバー
- `client/` : PKCE 付きのログインフローを実行するクライアント UI

## 事前準備

- Node.js 18 以上（開発では Node 22 で確認）
- npm

## セットアップ

1. 依存パッケージをインストールします。

   ```bash
   cd server
   npm install

   cd ../client
   npm install
   ```

2. 環境変数を設定します。サンプルとして `.env.local` には以下が含まれています。

   - `server/.env.local`
     ```
     SERVER_BASE_URL=http://localhost:4000
     JWT_SECRET=dev-secret-for-demo
     TOKEN_EXP_SECONDS=600
     CLIENTS_JSON=[{"client_id":"client-demo","redirect_uris":["http://localhost:3000/callback"]}]
     ```
   - `client/.env.local`
     ```
     CLIENT_BASE_URL=http://localhost:3000
     OAUTH_SERVER_URL=http://localhost:4000
     CLIENT_ID=client-demo
     REDIRECT_PATH=/callback
     ```

   必要に応じてポートやクライアント情報を調整してください。

## デモの実行手順

1. サーバーを起動します。

   ```bash
   cd server
   npm run dev   # http://localhost:4000
   ```

2. 別ターミナルでクライアントを起動します。

   ```bash
   cd client
   npm run dev   # http://localhost:3000
   ```

3. ブラウザで以下を実行します。

   1. `http://localhost:4000/register` にアクセスしてユーザー登録（初期ユーザー `test@example.com / passwd1234` も利用可能）。
   2. `http://localhost:3000/` を開き、「Login with OAuth Server」をクリック。
   3. サーバーのログイン画面で認証すると、PKCE を用いたコード交換 → トークン取得 → `/profile` へのリダイレクトが行われ、メールアドレスが表示されます。

## その他

- `server/lib` 配下にはセッション・認可コード・ユーザー情報を管理する簡易的なインメモリ実装が含まれます（開発時のホットリロードに対応するためグローバル変数を使用）。
- CORS は `CLIENTS_JSON` の `redirect_uris` で許可されたオリジンのみ通過します。別オリジンからアクセスする場合は該当 URL を追加してください。
- 本デモは学習用を想定しており、永続化やセキュリティ強化は行っていません。実運用では HTTPS、DB 永続化、CSRF 対策などを追加してください。

