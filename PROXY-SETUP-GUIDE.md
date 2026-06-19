# 🌐 Rotating IP Proxy Setup Guide

This guide explains how to set up and deploy multiple **Cloudflare Worker Proxies** to rotate outgoing IP addresses for your Groq, OpenRouter, or OpenAI API keys, preventing rate-limiting blocks and IP-based flags on Vercel.

---

## 🛠️ Step 1: Deploy the Cloudflare Workers

1. Log in to your **[Cloudflare Dashboard](https://dash.cloudflare.com/)**.
2. Navigate to **Workers & Pages** in the left sidebar.
3. Click **Create Application** ➔ **Create Worker**.
4. Name the worker based on the index (e.g., `groq-proxy-1`) and click **Deploy**.
5. Once deployed, click **Quick Edit** in the top-right corner.
6. Erase all template code inside the editor, and paste the code from [cloudflare-proxy-worker.js](file:///d:/Antigravity/architect-ai/cloudflare-proxy-worker.js).
7. Click **Save and Deploy**.
8. **Repeat** this process to deploy as many workers as you need (e.g., `groq-proxy-2`, `groq-proxy-3`, etc.).
9. Copy each worker's public URL (e.g., `https://groq-proxy-1.yoursubdomain.workers.dev`).

---

## ⚙️ Step 2: Configure Environment Variables on Vercel

Go to your **Vercel Project Dashboard** ➔ **Settings** ➔ **Environment Variables**, and add the following two variables:

### 1. `GROQ_API_KEYS`
Paste your API keys separated by commas (no spaces):
```env
gsk_key1_abc...,gsk_key2_xyz...,sk-or-openrouterkey...
```

### 2. `GROQ_PROXY_URLS`
Paste the matching Cloudflare Worker URLs in the **exact same order** separated by commas:
```env
https://groq-proxy-1.yoursubdomain.workers.dev,https://groq-proxy-2.yoursubdomain.workers.dev,https://groq-proxy-3.yoursubdomain.workers.dev
```

---

## 💡 How Key Pairing Works

The Next.js backend maps keys and proxy URLs **1-to-1 by their position (index)** in the comma-separated lists:

| API Key Position | Proxy URL Position | Egress Output IP |
|---|---|---|
| **Key #1** (position 0) | **Proxy #1** (position 0) | Cloudflare Edge IP pool |
| **Key #2** (position 1) | **Proxy #2** (position 1) | Cloudflare Edge IP pool |
| **Key #3** (position 2) | **Proxy #3** (position 2) | Cloudflare Edge IP pool |

### Rules & Best Practices:
* **Add new keys/proxies at the end**: If you want to scale up, simply add new API keys and proxy URLs at the end of their respective lists.
* **Keep counts matching**: If you provide 10 keys, you should provide 10 proxy URLs. If a key has no matching proxy URL at its index, it will bypass the proxy and call Groq directly (which risks leaking your server IP).
* **Worker Reusability**: The proxy worker is fully generic. It automatically detects if a key is a **Groq**, **OpenRouter**, or **OpenAI** key by its structure, and forwards the request to the correct provider.
