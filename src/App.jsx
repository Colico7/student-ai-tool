import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `你是一个专为学生设计的论文/长文总结助手。请对用户提供的文章进行结构化总结，输出格式如下：

## 📌 核心观点
用1-2句话概括文章最核心的论点或结论。

## 🧠 主要内容（3-5个要点）
- 要点1
- 要点2
- 要点3

## 🔍 关键概念
列出文章中出现的重要概念或术语，简短解释。

## 💡 学习价值
这篇文章对学习/研究有什么帮助？值得关注的地方？

## ❓ 可能考点（如适用）
如果是学术文章，列出可能被考察的知识点。

请用简洁易懂的中文输出，帮助学生快速理解和掌握文章内容。`;

const FREE_LIMIT = 3;

function useLocalStorage(key, initial) {
  const [val, setVal] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) ?? initial; }
    catch { return initial; }
  });
  const set = (v) => { setVal(v); localStorage.setItem(key, JSON.stringify(v)); };
  return [val, set];
}

function CountBadge({ used, limit }) {
  const left = limit - used;
  return (
    <div className="count-badge">
      <span className="count-num" style={{ color: left <= 1 ? "#ff6b6b" : "#4ade80" }}>{left}</span>
      <span className="count-label">次免费剩余</span>
    </div>
  );
}

function PaywallModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-icon">🎓</div>
        <h2 className="modal-title">今日免费次数已用完</h2>
        <p className="modal-desc">升级会员，无限使用所有AI学习工具</p>
        <div className="plans">
          <div className="plan plan-highlight">
            <div className="plan-badge">推荐</div>
            <div className="plan-name">月度会员</div>
            <div className="plan-price">¥9.9<span>/月</span></div>
            <ul className="plan-features">
              <li>✓ 无限次论文总结</li>
              <li>✓ 简历一键生成</li>
              <li>✓ 作业润色优化</li>
              <li>✓ 读书笔记生成</li>
            </ul>
            <button className="plan-btn">立即开通</button>
          </div>
          <div className="plan">
            <div className="plan-name">年度会员</div>
            <div className="plan-price">¥59<span>/年</span></div>
            <ul className="plan-features">
              <li>✓ 全部月度权益</li>
              <li>✓ 优先响应速度</li>
              <li>✓ 专属学习报告</li>
              <li>✓ 省下 ¥59.8</li>
            </ul>
            <button className="plan-btn plan-btn-outline">选择年度</button>
          </div>
        </div>
        <button className="modal-close" onClick={onClose}>×</button>
      </div>
    </div>
  );
}

function TypingText({ text }) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const iv = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(iv);
    }, 8);
    return () => clearInterval(iv);
  }, [text]);
  return <span>{displayed}</span>;
}

export default function App() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [usedCount, setUsedCount] = useLocalStorage("summarize_used", 0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [copied, setCopied] = useState(false);
  const resultRef = useRef(null);

  const wordCount = input.trim().split(/\s+|\n+/).filter(Boolean).length;

  async function handleSummarize() {
    if (!input.trim()) return;
    if (usedCount >= FREE_LIMIT) { setShowPaywall(true); return; }
    setLoading(true);
    setResult("");
    setError("");
    try {
  const apiKey = import.meta.env.VITE_API_KEY;
  const res = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
  method: "POST",
  headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
  body: JSON.stringify({
    model: "qwen-plus",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `请总结以下文章：\n\n${input}` }
    ],
  }),
});
const data = await res.json();
const text = data.choices?.[0]?.message?.content || "总结失败，请重试。";
      setResult(text);
      setUsedCount(usedCount + 1);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClear() {
    setInput("");
    setResult("");
    setError("");
  }

  function renderResult(text) {
    const sections = text.split(/\n(?=##\s)/);
    return sections.map((section, i) => {
      const lines = section.split("\n");
      const heading = lines[0].replace(/^##\s*/, "");
      const body = lines.slice(1).join("\n").trim();
      return (
        <div key={i} className="result-section" style={{ animationDelay: `${i * 0.08}s` }}>
          <h3 className="result-heading">{heading}</h3>
          <div className="result-body">
            {body.split("\n").map((line, j) => (
              <p key={j} className={line.startsWith("- ") ? "result-bullet" : "result-para"}>
                {line.startsWith("- ") ? line.slice(2) : line}
              </p>
            ))}
          </div>
        </div>
      );
    });
    }
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700&family=Space+Mono:wght@400;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0e1a; color: #e8e4d8; font-family: 'Noto Serif SC', serif; min-height: 100vh; }
        .app { max-width: 780px; margin: 0 auto; padding: 40px 20px 80px; }
        .header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 48px; }
        .header-left { flex: 1; }
        .logo { font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: 0.25em; text-transform: uppercase; color: #4ade80; margin-bottom: 12px; opacity: 0.8; }
        .title { font-size: clamp(28px, 5vw, 42px); font-weight: 700; line-height: 1.15; color: #f0ebe0; letter-spacing: -0.02em; }
        .title em { font-style: normal; color: #4ade80; }
        .subtitle { margin-top: 10px; font-size: 14px; color: #7a7a8c; font-family: 'Space Mono', monospace; }
        .count-badge { display: flex; flex-direction: column; align-items: center; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 12px 16px; min-width: 70px; }
        .count-num { font-family: 'Space Mono', monospace; font-size: 28px; font-weight: 700; line-height: 1; }
        .count-label { font-size: 10px; color: #7a7a8c; margin-top: 4px; white-space: nowrap; }
        .input-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 24px; margin-bottom: 20px; transition: border-color 0.2s; }
        .input-card:focus-within { border-color: rgba(74, 222, 128, 0.3); }
        .input-label { font-family: 'Space Mono', monospace; font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: #4ade80; margin-bottom: 12px; opacity: 0.7; }
        textarea { width: 100%; background: transparent; border: none; outline: none; color: #e8e4d8; font-family: 'Noto Serif SC', serif; font-size: 15px; line-height: 1.8; resize: none; min-height: 200px; }
        textarea::placeholder { color: #3a3a4c; }
        .input-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.05); }
        .word-count { font-family: 'Space Mono', monospace; font-size: 11px; color: #4a4a5c; }
        .btn-clear { background: none; border: none; color: #4a4a5c; font-family: 'Space Mono', monospace; font-size: 11px; cursor: pointer; }
        .btn-main { width: 100%; padding: 18px; background: #4ade80; color: #0a0e1a; border: none; border-radius: 14px; font-family: 'Space Mono', monospace; font-size: 14px; font-weight: 700; cursor: pointer; position: relative; overflow: hidden; }
        .btn-main:disabled { background: #2a2e3a; color: #4a4a5c; cursor: not-allowed; }
        .btn-main.loading::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%); animation: shimmer 1.2s infinite; }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .error-msg { margin-top: 12px; padding: 12px 16px; background: rgba(255,107,107,0.1); border: 1px solid rgba(255,107,107,0.2); border-radius: 10px; color: #ff6b6b; font-size: 13px; text-align: center; }
        .result-card { margin-top: 32px; background: rgba(255,255,255,0.02); border: 1px solid rgba(74,222,128,0.15); border-radius: 20px; overflow: hidden; }
        .result-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(74,222,128,0.04); }
        .result-title { font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: #4ade80; }
        .btn-copy { background: rgba(74,222,128,0.1); border: 1px solid rgba(74,222,128,0.2); border-radius: 8px; color: #4ade80; font-family: 'Space Mono', monospace; font-size: 11px; padding: 6px 12px; cursor: pointer; }
        .result-body-wrap { padding: 24px; }
        .result-section { margin-bottom: 24px; animation: fadeUp 0.4s ease both; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .result-heading { font-size: 15px; font-weight: 700; color: #f0ebe0; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .result-bullet { font-size: 14px; line-height: 1.8; color: #c8c4b8; padding-left: 16px; position: relative; margin-bottom: 4px; }
        .result-bullet::before { content: '▸'; position: absolute; left: 0; color: #4ade80; font-size: 10px; top: 4px; }
        .result-para { font-size: 14px; line-height: 1.8; color: #c8c4b8; margin-bottom: 4px; }
        .skeleton-wrap { padding: 24px; }
        .skeleton { height: 14px; border-radius: 6px; background: rgba(255,255,255,0.05); margin-bottom: 10px; animation: pulse 1.4s ease infinite; }
        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.9; } }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
        .modal { background: #141824; border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 40px 32px 32px; max-width: 480px; width: 100%; position: relative; text-align: center; }
        .modal-icon { font-size: 40px; margin-bottom: 12px; }
        .modal-title { font-size: 22px; font-weight: 700; margin-bottom: 8px; }
        .modal-desc { font-size: 14px; color: #7a7a8c; margin-bottom: 28px; }
        .plans { display: flex; gap: 14px; margin-bottom: 8px; }
        .plan { flex: 1; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 20px 16px; position: relative; }
        .plan-highlight { border-color: rgba(74,222,128,0.35); background: rgba(74,222,128,0.04); }
        .plan-badge { position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #4ade80; color: #0a0e1a; font-family: 'Space Mono', monospace; font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
        .plan-name { font-size: 13px; color: #7a7a8c; margin-bottom: 8px; }
        .plan-price { font-family: 'Space Mono', monospace; font-size: 26px; font-weight: 700; color: #f0ebe0; margin-bottom: 14px; }
        .plan-price span { font-size: 13px; color: #7a7a8c; }
        .plan-features { list-style: none; text-align: left; margin-bottom: 16px; }
        .plan-features li { font-size: 12px; color: #9a9aac; margin-bottom: 6px; }
        .plan-btn { width: 100%; padding: 10px; background: #4ade80; color: #0a0e1a; border: none; border-radius: 10px; font-family: 'Space Mono', monospace; font-size: 12px; font-weight: 700; cursor: pointer; }
        .plan-btn-outline { background: transparent; border: 1px solid rgba(255,255,255,0.15); color: #e8e4d8; }
        .modal-close { position: absolute; top: 16px; right: 20px; background: none; border: none; color: #7a7a8c; font-size: 22px; cursor: pointer; }
        .features { display: flex; gap: 8px; margin-top: 40px; flex-wrap: wrap; }
        .feature-tag { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; padding: 6px 14px; font-size: 12px; color: #6a6a7c; font-family: 'Space Mono', monospace; }
        .feature-tag.soon { opacity: 0.4; }
      `}</style>
      <div className="app">
        <div className="header">
          <div className="header-left">
            <div className="logo">Student AI Tools</div>
            <h1 className="title">论文<em>秒懂</em><br />AI总结助手</h1>
            <p className="subtitle">粘贴文章 → 5秒读懂核心</p>
          </div>
          <CountBadge used={usedCount} limit={FREE_LIMIT} />
        </div>
        <div className="input-card">
          <div className="input-label">粘贴你的论文 / 长文</div>
          <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="将论文、课文、研究报告粘贴到这里...&#10;&#10;支持中英文，最长约5000字" />
          <div className="input-footer">
            <span className="word-count">{wordCount > 0 ? `约 ${wordCount} 词` : "支持中英文"}</span>
            {input && <button className="btn-clear" onClick={handleClear}>清空</button>}
          </div>
        </div>
        <button className={`btn-main${loading ? " loading" : ""}`} onClick={handleSummarize} disabled={loading || !input.trim()}>
          {loading ? "AI 正在阅读分析中..." : "✦ 一键生成总结"}
        </button>
        {error && <div className="error-msg">{error}</div>}
        {(loading || result) && (
          <div className="result-card" ref={resultRef}>
            <div className="result-header">
              <span className="result-title">✦ AI 总结结果</span>
              {result && <button className="btn-copy" onClick={handleCopy}>{copied ? "已复制 ✓" : "复制全文"}</button>}
            </div>
            {loading ? (
              <div className="skeleton-wrap">
                {[90,70,85,60,75,50,80].map((w,i) => (
                  <div key={i} className="skeleton" style={{ width: `${w}%`, animationDelay: `${i*0.1}s` }} />
                ))}
              </div>
            ) : (
              <div className="result-body-wrap">{renderResult(result)}</div>
            )}
          </div>
        )}
        <div className="features">
          <span className="feature-tag">✓ 论文总结</span>
          <span className="feature-tag soon">○ 简历生成 即将上线</span>
          <span className="feature-tag soon">○ 作业润色 即将上线</span>
          <span className="feature-tag soon">○ 读书笔记 即将上线</span>
        </div>
      </div>
      {showPaywall && <PaywallModal onClose={() => setShowPaywall(false)} />}
    </>
  );
}
