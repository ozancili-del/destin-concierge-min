import { useState } from "react";

export default function Home() {
  const [log, setLog] = useState([
    { role: "assistant", content: "Hi! I’m your Destin Concierge. Tell me your unit, dates, adults and kids. Example: Pelican-201, Oct 10–14, 2 adults, 1 child." }
  ]);
  const [q, setQ] = useState("");

  async function send(e) {
    e.preventDefault();
    if (!q.trim()) return;
    const next = [...log, { role: "user", content: q.trim() }];
    setLog(next);
    setQ("");
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: next })
    });
    const data = await r.json();
    setLog([...next, data.reply]);
    const box = document.getElementById("log");
    setTimeout(() => (box.scrollTop = box.scrollHeight), 0);
  }

  return (
    <main style={{ fontFamily: "system-ui, Arial", maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1>Destin Concierge</h1>
      <div id="log" style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, height: 420, overflow: "auto", background: "#fff" }}>
        {log.map((m, i) => (
          <div key={i} style={{ margin: "10px 0" }}>
            <b>{m.role === "user" ? "You" : "AI"}:</b> <span dangerouslySetInnerHTML={{ __html: m.content.replace(/\n/g, "<br>") }} />
          </div>
        ))}
      </div>
      <form onSubmit={send} style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type your message or dates e.g. Oct 10–14…" style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #ccc" }} />
        <button style={{ padding: "10px 16px", borderRadius: 10 }}>Send</button>
      </form>
      <p style={{ color: "#666", fontSize: 12, marginTop: 8 }}>
        Tip: “Pelican-201, Oct 10–14, 2 adults, 1 child”
      </p>
    </main>
  );
}
