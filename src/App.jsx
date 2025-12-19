import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { getWordOfTheDay } from "./wordOfDay";

const storageKey = "sayit_session_v1";
const reactionChoices = ["😂", "🔥", "🤔", "👀", "💀", "❤️"];

const api = {
  async post(path, body) {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  },
  async get(path) {
    const res = await fetch(path);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  },
};

function loadSession() {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn("Failed to load session", e);
    return null;
  }
}

function saveSession(session) {
  localStorage.setItem(storageKey, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(storageKey);
}

function App() {
  const word = useMemo(() => getWordOfTheDay(), []);
  const [session, setSession] = useState(() => loadSession());
  const [username, setUsername] = useState(session?.username || "");
  const [groupCode, setGroupCode] = useState(session?.groupId || "");
  const [sentence, setSentence] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const hasSubmitted =
    !!session &&
    !!status?.submissions?.some(
      (s) => s.participantId === session.participantId && s.date === word.date
    );

  useEffect(() => {
    if (session?.groupId) {
      fetchStatus(session.groupId, word.date);
    }
  }, [session?.groupId, word.date]);

  async function fetchStatus(groupId, date) {
    setLoading(true);
    setError("");
    try {
      const data = await api.get(`/api/groups/${groupId}/status?date=${date}`);
      setStatus(data);
    } catch (err) {
      setError(err.message || "Could not load group status");
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateGroup() {
    setError("");
    setInfo("");
    if (!username.trim()) {
      setError("Pick a funny username first.");
      return;
    }
    try {
      setLoading(true);
      const { groupId } = await api.post("/api/groups");
      const joinRes = await api.post(`/api/groups/${groupId}/join`, {
        username: username.trim(),
        participantId: session?.participantId,
      });
      const nextSession = {
        participantId: joinRes.participantId,
        username: joinRes.username,
        groupId: joinRes.groupId,
      };
      saveSession(nextSession);
      setSession(nextSession);
      setGroupCode(groupId);
      setInfo("Group created! Share the code and start playing.");
      await fetchStatus(groupId, word.date);
    } catch (err) {
      setError(err.message || "Could not create group");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinGroup() {
    setError("");
    setInfo("");
    const code = groupCode.trim().toUpperCase();
    if (!code) {
      setError("Enter a group code to join.");
      return;
    }
    if (!username.trim()) {
      setError("Pick a funny username first.");
      return;
    }
    try {
      setLoading(true);
      const joinRes = await api.post(`/api/groups/${code}/join`, {
        username: username.trim(),
        participantId: session?.participantId,
      });
      const nextSession = {
        participantId: joinRes.participantId,
        username: joinRes.username,
        groupId: joinRes.groupId,
      };
      saveSession(nextSession);
      setSession(nextSession);
      setGroupCode(code);
      setInfo("Joined! Submit your sentence to see the group.");
      await fetchStatus(code, word.date);
    } catch (err) {
      setError(err.message || "Could not join group");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    setError("");
    setInfo("");
    if (!session?.participantId || !session?.groupId) {
      setError("Join a group first.");
      return;
    }
    if (!sentence.trim()) {
      setError("Add a sentence that uses the word.");
      return;
    }
    try {
      setSubmitting(true);
      await api.post(`/api/groups/${session.groupId}/submit`, {
        participantId: session.participantId,
        sentence: sentence.trim(),
        date: word.date,
      });
      setSentence("");
      setInfo("Submitted! Group sentences unlocked.");
      fetchStatus(session.groupId, word.date);
    } catch (err) {
      setError(err.message || "Could not submit");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSwitchGroup() {
    clearSession();
    setSession(null);
    setStatus(null);
    setGroupCode("");
    setSentence("");
    setInfo("");
    setError("");
  }

  const showGroupArea = !!session?.groupId;
  const participants = status?.participants || [];
  const submissions = status?.submissions || [];

  function applyLocalReaction(submissionId, emoji) {
    setStatus((prev) => {
      if (!prev) return prev;
      const nextSubs = prev.submissions.map((s) => {
        if (s.submissionId !== submissionId) return s;
        const reactions = { ...(s.reactions || {}) };
        const current = Array.isArray(reactions[emoji]) ? reactions[emoji] : [];
        const has = current.includes(session.participantId);
        const updated = has
          ? current.filter((id) => id !== session.participantId)
          : [...current, session.participantId];
        if (updated.length) {
          reactions[emoji] = updated;
        } else {
          delete reactions[emoji];
        }
        return { ...s, reactions };
      });
      return { ...prev, submissions: nextSubs };
    });
  }

  async function toggleReaction(submissionId, emoji) {
    if (!session?.participantId || !session?.groupId) return;
    applyLocalReaction(submissionId, emoji);
    try {
      await api.post(`/api/groups/${session.groupId}/react`, {
        submissionId,
        emoji,
        participantId: session.participantId,
      });
    } catch (err) {
      // Revert on failure
      applyLocalReaction(submissionId, emoji);
      setError(err.message || "Could not react");
    }
  }

  const participantName = (participantId) =>
    participants.find((p) => p.participantId === participantId)?.username || "Unknown";

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="title-wrap">
          <div className="logo">SAY IT</div>
          <div className="tagline">One word. One day. One sentence.</div>
        </div>
        <img src="/yeti.svg" alt="Friendly yeti" className="yeti" />
      </header>

      <main className="content">
        <section className="card word-card">
          <div className="pill main-pill">
            <span>Word of the day</span>
            <span className="pill-sub">{word.date} (EST)</span>
          </div>
          <div className="word-row">
            <div>
              <div className="word">{word.word}</div>
              {word.pronunciation && (
                <div className="pronunciation">{word.pronunciation}</div>
              )}
            </div>
            <div className="def">
              <div className="definition">{word.definition}</div>
              <div className="example">Example: {word.example}</div>
              {word.etymology && (
                <div className="etymology">Etymology: {word.etymology}</div>
              )}
            </div>
          </div>
        </section>

        {!showGroupArea && (
          <section className="card action-card">
            <div className="card-title">Grab friends and play</div>
            <label className="field">
              <div className="label">Username</div>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="fuzzy-yeti, pun-master, etc."
              />
            </label>
            <label className="field">
              <div className="label">Group code</div>
              <input
                value={groupCode}
                onChange={(e) => setGroupCode(e.target.value.toUpperCase())}
                placeholder="Enter to join, or leave empty to create"
                maxLength={6}
              />
            </label>
            <div className="action-row">
              <button
                className="primary"
                onClick={handleCreateGroup}
                disabled={loading}
              >
                {loading ? "Working..." : "Create a group"}
              </button>
              <button onClick={handleJoinGroup} disabled={loading}>
                Join group
              </button>
            </div>
            {error && <div className="error">{error}</div>}
            {info && <div className="info">{info}</div>}
          </section>
        )}

        {showGroupArea && (
          <section className="card group-card">
            <div className="group-header">
              <div>
                <div className="eyebrow">Group code</div>
                <div className="group-code">{session.groupId}</div>
                <div className="tiny">Share this code with friends</div>
              </div>
              <div className="pill light">You are: {session.username}</div>
            </div>

            <div className="divider" />

            <label className="field">
              <div className="label">Use the word in a sentence</div>
              <textarea
                value={sentence}
                onChange={(e) => setSentence(e.target.value)}
                placeholder={`Drop a sentence using "${word.word}".`}
                rows={3}
                disabled={hasSubmitted}
              />
            </label>
            <button
              className="primary wide"
              onClick={handleSubmit}
              disabled={submitting || hasSubmitted}
            >
              {hasSubmitted ? "Already submitted" : submitting ? "Sending..." : "Submit"}
            </button>

            {error && <div className="error">{error}</div>}
            {info && <div className="info">{info}</div>}
            {loading && <div className="muted">Loading group status...</div>}

            <div className="divider" />

            {!hasSubmitted && (
              <div className="locked">
                <div className="lock-title">Group progress unlocks after you submit.</div>
                <div className="tiny">Your friends' sentences are hidden until then.</div>
              </div>
            )}

            {hasSubmitted && (
              <div className="status-grid">
                <div>
                  <div className="eyebrow">Members</div>
                  <ul className="list">
                    {participants.map((p) => {
                      const done = submissions.some(
                        (s) => s.participantId === p.participantId
                      );
                      return (
                        <li key={p.participantId} className="list-item">
                          <span className={done ? "status done" : "status pending"}>
                            {done ? "✅" : "⏳"}
                          </span>
                          <span className="name">{p.username}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div>
                  <div className="eyebrow">Today's sentences</div>
                  <ul className="list">
                    {submissions.map((s) => (
                      <li key={s.submissionId} className="list-item sentence">
                        <div className="name">
                          {participantName(s.participantId)}{" "}
                          <span className="muted">•</span>{" "}
                          <span className="muted">{word.date}</span>
                        </div>
                        <div>{s.sentence}</div>
                        <div className="reactions">
                          <div className="reaction-pills">
                            {Object.entries(s.reactions || {}).map(([emoji, ids]) => (
                              <button
                                key={emoji}
                                className={`reaction-pill ${
                                  ids.includes(session?.participantId) ? "active" : ""
                                }`}
                                onClick={() => toggleReaction(s.submissionId, emoji)}
                              >
                                <span>{emoji}</span>
                                <span className="count">{ids.length}</span>
                              </button>
                            ))}
                          </div>
                          <div className="reaction-choices">
                            {reactionChoices.map((emoji) => (
                              <button
                                key={emoji}
                                className="reaction-choice"
                                onClick={() => toggleReaction(s.submissionId, emoji)}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      </li>
                    ))}
                    {submissions.length === 0 && (
                      <li className="list-item muted">No sentences yet.</li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            <div className="switch-row">
              <button className="ghost" onClick={handleSwitchGroup}>
                Switch group
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
