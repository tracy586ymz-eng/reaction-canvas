# Connect your own LLM

For Reaction Canvas 0.1. Enter three values once in **设置**: an API base URL, your own API key, and a complete model ID. Cloud inference needs no downloaded model or dedicated GPU. The fixed offline example works without a service; it is not a connectivity or accuracy test.

[完整中文教程](LLM_SETUP.zh-CN.md) · [Privacy](PRIVACY.md)

![Empty settings dialog with no credentials](../assets/llm-settings-empty.png)

The image is an isolated blank-settings demo, not an authenticated customer account.

## SiliconFlow

1. Sign into [SiliconFlow](https://cloud.siliconflow.cn) and create your own key under [API Keys](https://cloud.siliconflow.cn/account/ak). See the [official quickstart](https://docs.siliconflow.cn/docs/userguide/quickstart). Paste it only into the app's password field, without `Bearer`, quotes, login passwords or verification codes.
2. Check the model's current price, account access and image-input capability in the provider console. Screenshots require image/text input and text output. Image generators and text-only models are not substitutes; see [SiliconFlow vision](https://docs.siliconflow.cn/docs/userguide/capabilities/vision).
3. Open **设置**, click **硅基流动** and use `https://api.siliconflow.cn/v1`. This is the base URL; do not append `/models` or `/chat/completions`.
4. Paste your key and click **连接并获取模型**. Select a verified model or enter its complete ID, preserving case and slashes. Model discovery is not a price or vision guarantee.
5. Confirm **我已确认这个模型支持图片输入** only when applicable. With free mode enabled, verify the selected model is currently free and confirm it in the app. For a paid model, deliberately disable free mode after reviewing costs. There is no automatic price detection or billing cap.
6. Read and confirm **允许把我选中的图片、问题及本任务上下文发送给此服务**, then click **保存设置**. If you decline transmission, choose offline mode instead.
7. Start a new task and send a harmless text question. Then test a synthetic or licensed, nonconfidential image. Upload/paste/drag stages until Send; successful shortcut capture starts analysis. Mac may need OS capture permission. Replies demonstrate connectivity, not chemical accuracy.

Keys are stored when connecting or saving, separately per service URL. Closing settings does not revoke a provider key. **移除当前服务密钥** removes the local stored value; revoke the actual key in the provider console if needed. A platform credit or membership is not proof a model is free. If your account has no free vision model, start with free text discussion or deliberately choose an allowed vision service.

## Provider compatibility

Other providers or a company gateway need an HTTPS base URL, their own key and a complete model ID. Current support is for OpenAI-style Chat Completions; an OpenAI account is not required. A website chat login or a provider's different native API is not enough.

The app uses `GET {base}/models` for discovery and `POST {base}/chat/completions` for analysis with Bearer authentication for remote hosts. Analysis uses system/user/assistant messages, non-streaming content, `temperature`, `max_tokens`, and data-URL images in `image_url` parts for vision. The model must follow the app's structured JSON prompt. Services must accept these fields and return usable content under `choices[0].message.content`; “OpenAI-compatible” alone is not proof that every model works. If discovery is unsupported, enter the full model ID manually and verify analysis separately. Custom auth headers and different native API formats are not configurable in 0.1.

Switching base URL requires fresh model/vision/price/consent checks. A credential for one service is not reused by another. See the Chinese guide's troubleshooting table for connection, access, model ID, vision, rate-limit and output-format failures. Avoid sharing raw calls, keys or workspace backups in public issues.

## Existing local server

With Ollama already running and a model installed, click **本机兼容服务**, use `http://127.0.0.1:11434/v1`, leave the key blank, get models and select the installed model. Confirm capability, management and transmission before saving. See [Ollama compatibility](https://docs.ollama.com/api/openai-compatibility).

The app does not install/download/start local models. Local inference still consumes your hardware; tiny text models do not read images or have proven general chemistry accuracy. A local server can forward to the cloud depending on its own configuration. In 0.1, loopback requests do not include Authorization, so authenticated local servers are not supported. Remote/LAN HTTP is rejected; ask your administrator for an approved HTTPS compatible gateway.
