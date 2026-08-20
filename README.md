# Grok 语声

用 [Grok Voice](https://docs.x.ai/docs/guides/voice) 朗读文本。句子语速默认 **0.82**，走的是 xAI TTS，不是浏览器系统合成音。

## 功能

- 真实 Grok 音色（Eve、Ara、Luna、Leo 等）
- 句子语速 0.70–1.50，默认 0.82（写入合成，不是播放倍速）
- 中文优先，自动识别中 / 英 / 日 / 韩
- Google / X 登录（可选）

## 本地运行

需要 Node 22 和 xAI API Key。

```bash
npm install
export XAI_API_KEY=xai-...
npm run dev
```

开发服务默认 `http://localhost:8080`。

生产构建：

```bash
npm run build
npm run preview
```

TTS 走服务端 `POST /api/tts` → `https://api.x.ai/v1/tts`，密钥不会进浏览器。

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `XAI_API_KEY` | xAI API 密钥（服务端，必填才能朗读） |
| `DATABASE_URL` | 可选。有则用 Postgres；没有则用内嵌 PGLite |
| `VITE_AUTH_ENABLED` | 设为 `false` 可关掉登录 |

不要把密钥写进仓库。

## 许可

MIT
