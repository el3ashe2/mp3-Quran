import React, { useEffect, useState } from "react";
import axios from "axios";

// --- SEO Hook ---
function useSeo({ title, description, keywords }) {
  useEffect(() => {
    if (title) document.title = title;
    if (description) {
      let tag = document.querySelector('meta[name="description"]');
      if (!tag) {
        tag = document.createElement('meta');
        tag.name = 'description';
        document.head.appendChild(tag);
      }
      tag.content = description;
    }
    if (keywords) {
      let tag = document.querySelector('meta[name="keywords"]');
      if (!tag) {
        tag = document.createElement('meta');
        tag.name = 'keywords';
        document.head.appendChild(tag);
      }
      tag.content = Array.isArray(keywords) ? keywords.join(', ') : keywords;
    }
  }, [title, description, keywords]);
}

const PAGE_SIZE_RECITERS = 20;
const PAGE_SIZE_SURAHS = 20;
function pad3(n) { return n.toString().padStart(3, "0"); }

const DARK = { background: "#181a1b", color: "#f1f1f1", card: "#222426", accent: "#0bb3c8", input: "#282b2c", border: "#444446" };
const LIGHT = { background: "#fafbfc", color: "#181a1b", card: "#fff", accent: "#0bb3c8", input: "#fafbfc", border: "#ddd" };

// CounterAPI config
const COUNTER_BASE = "https://api.counterapi.dev/v2/qan/quran";
const API_TOKEN = "ut_ztYqsEQGaoYnyV5WYYvEDntXo7UrlRYU31EGYg1z";

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const theme = darkMode ? DARK : LIGHT;

  const [languages, setLanguages] = useState([]);
  const [activeLang, setActiveLang] = useState("ar");
  const [reciters, setReciters] = useState([]);
  const [filteredReciters, setFilteredReciters] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedReciter, setSelectedReciter] = useState(null);
  const [surahNames, setSurahNames] = useState({});
  const [reciterPage, setReciterPage] = useState(1);
  const [surahPage, setSurahPage] = useState(1);
  const [playingSid, setPlayingSid] = useState(null);
  const [activeLetter, setActiveLetter] = useState("");

  const [visitCount, setVisitCount] = useState(0);

  // SEO
  useSeo({
    title: selectedReciter
      ? `${selectedReciter.name} - MP3 Quran Player`
      : "MP3 Quran Player - Listen and Download Quran Recitations",
    description: selectedReciter
      ? `Listen to reciter ${selectedReciter.name}'s Quran audio in your language.`
      : "Discover and play Quran audio recitations from top readers in multiple languages. Free Quran mp3 download and streaming.",
    keywords: [
      "Quran",
      "mp3 Quran",
      "Quran audio",
      "reciters",
      "Islamic audio",
      "quran player",
      ...(selectedReciter ? [selectedReciter.name] : [])
    ]
  });

  // Visitor counter from CounterAPI
  useEffect(() => {
    const visitedKey = "visitor_counted";
    const headers = { Authorization: `Bearer ${API_TOKEN}` };

    async function incrementAndFetch() {
      try {
        await axios.post(`${COUNTER_BASE}/up`, {}, { headers });
        await fetchCount();
        sessionStorage.setItem(visitedKey, "true");
      } catch {
        setVisitCount(0);
      }
    }

    async function fetchCount() {
      try {
        const res = await axios.get(COUNTER_BASE, { headers });
        setVisitCount(res.data.data.up_count || 0);
      } catch {
        setVisitCount(0);
      }
    }

    if (!sessionStorage.getItem(visitedKey)) {
      incrementAndFetch();
    } else {
      fetchCount();
    }
  }, []);

  // Load languages
  useEffect(() => {
    axios.get("https://www.mp3quran.net/api/v3/languages")
      .then(res => setLanguages(res.data.language || []));
  }, []);

  // Load reciters and surahs on lang change
  useEffect(() => {
    setSelectedReciter(null);
    setReciterPage(1);
    setSurahPage(1);
    setSearch("");
    setActiveLetter("");
    if (!activeLang) return;
    axios.get(`https://www.mp3quran.net/api/v3/reciters?language=${activeLang}`)
      .then(res => {
        const recitersArr = Array.isArray(res.data.reciters) ? res.data.reciters : [];
        setReciters(recitersArr);
        setFilteredReciters(recitersArr);
      });
    axios.get(`https://www.mp3quran.net/api/v3/suwar?language=${activeLang}`)
      .then(r => {
        const names = {};
        const suwarArr = Array.isArray(r.data.suwar) ? r.data.suwar : [];
        suwarArr.forEach(s => { names[s.id] = s.name });
        setSurahNames(names);
      });
  }, [activeLang]);

  // Filter reciters by letter and search
  useEffect(() => {
    setReciterPage(1);
    let filtered = reciters || [];
    if (activeLetter) filtered = filtered.filter(r => r.letter === activeLetter);
    if (search) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter(r =>
        (r.name && r.name.toLowerCase().includes(lowerSearch)) ||
        (r.letter && r.letter.toLowerCase().includes(lowerSearch)));
    }
    setFilteredReciters(filtered);
  }, [search, reciters, activeLetter]);

  // Unique letters for filter buttons
  const uniqueLetters = Array.from(new Set((reciters || []).map(rec => rec.letter).filter(Boolean)));

  // Pagination for reciters
  const lastReciter = reciterPage * PAGE_SIZE_RECITERS;
  const firstReciter = lastReciter - PAGE_SIZE_RECITERS;
  const paginatedReciters = (filteredReciters || []).slice(firstReciter, lastReciter);
  const pageCountReciters = Math.max(1, Math.ceil((filteredReciters || []).length / PAGE_SIZE_RECITERS));

  // Surah data and pagination
  let surahs = [];
  let surahServer = "";
  if (
    selectedReciter &&
    Array.isArray(selectedReciter.moshaf) &&
    selectedReciter.moshaf.length > 0 &&
    selectedReciter.moshaf[0] &&
    typeof selectedReciter.moshaf[0].surah_list === "string"
  ) {
    surahs = selectedReciter.moshaf[0].surah_list.split(",") || [];
    surahServer = selectedReciter.moshaf[0].server;
  }
  const lastSurah = surahPage * PAGE_SIZE_SURAHS;
  const firstSurah = lastSurah - PAGE_SIZE_SURAHS;
  const paginatedSurahs = (surahs || []).slice(firstSurah, lastSurah);
  const pageCountSurahs = Math.max(1, Math.ceil((surahs || []).length / PAGE_SIZE_SURAHS));


  return (
    <div style={{ fontFamily: "Segoe UI,Arial,sans-serif", minHeight: "100vh", background: theme.background, color: theme.color, display: "flex", flexDirection: "column" }}>
      {/* Banner Image */}
      <div style={{ width: "100%", marginBottom: 18 }}>
        <img
          src="https://user-gen-media-assets.s3.amazonaws.com/seedream_images/7d1835f5-5309-4235-b141-4887d8915e48.png"
          alt="[translate:المصحف المرتل]"
          style={{ width: "100%", maxHeight: 180, objectFit: "cover" }}
        />
      </div>

      {/* Languages & Search */}
      <div style={{ textAlign: "center", margin: "20px 0" }}>
        <h1 style={{ margin: 0 }}>MP3 Quran Player</h1>
        <button
          style={{ position: "absolute", top: 25, right: 32, padding: "8px 18px", background: theme.accent, color: "#fff", borderRadius: 12, border: "none", fontWeight: "bold", fontSize: 16, cursor: "pointer" }}
          onClick={() => setDarkMode(m => !m)}
        >
          {darkMode ? "☀️ Light" : "🌙 Dark"}
        </button>
      </div>

      {!selectedReciter && (
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <select style={{ fontSize: 18, padding: "8px 16px", borderRadius: 8, background: theme.input, color: theme.color, border: `1px solid ${theme.border}`, marginRight: 16, marginTop: 6, maxWidth: 170 }}
            value={activeLang} onChange={e => setActiveLang(e.target.value)}>
            {languages.map(lang =>
              <option key={lang.id} value={lang.locale}>
                {lang.native} ({lang.locale})
              </option>
            )}
          </select>
          <input
            style={{ fontSize: 18, padding: "8px 16px", borderRadius: 8, background: theme.input, color: theme.color, border: `1px solid ${theme.border}`, maxWidth: 220, width: "90vw" }}
            placeholder="Search reciters"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Letters Filter Buttons */}
      {!selectedReciter && (
        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "7px", marginBottom: 24 }}>
          <button
            onClick={() => setActiveLetter("")}
            style={{
              padding: "7px 14px", margin: "0 3px",
              background: activeLetter === "" ? theme.accent : theme.card,
              color: activeLetter === "" ? "#fff" : theme.color,
              borderRadius: 8, border: `1px solid ${theme.border}`,
              fontWeight: "bold",
              fontSize: 16,
              minWidth: 42,
              cursor: "pointer"
            }}
          >الكل</button>
          {uniqueLetters.map(letter => (
            <button
              key={letter}
              onClick={() => setActiveLetter(letter)}
              style={{
                padding: "7px 14px", margin: "0 3px",
                background: activeLetter === letter ? theme.accent : theme.card,
                color: activeLetter === letter ? "#fff" : theme.color,
                borderRadius: 8, border: `1px solid ${theme.border}`,
                fontWeight: "bold",
                fontSize: 17,
                minWidth: 42,
                cursor: "pointer"
              }}
            >{letter}</button>
          ))}
        </div>
      )}

      {/* Reciters */}
      {!selectedReciter && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 20, margin: "0 auto", maxWidth: "100%", padding: "0 12px", boxSizing: "border-box" }}>
            {paginatedReciters.length === 0 ? (
              <div style={{ gridColumn: "1/-1", textAlign: "center", color: "#d32f2f", fontSize: 20 }}>
                No reciters found for this language.
              </div>
            ) : (
              paginatedReciters.map(rec => (
                <div
                  key={rec.id}
                  style={{ background: theme.card, boxShadow: `0 2px 8px ${theme.border}`, borderRadius: 14, padding: 14, textAlign: "center", transition: "0.2s", cursor: "pointer", fontSize: 16 }}
                  onClick={() => { setSelectedReciter(rec); setSurahPage(1); setPlayingSid(null); }}
                >
                  <div style={{ fontWeight: "bold", fontSize: 17, marginBottom: 4 }}>{rec.name}</div>
                </div>
              ))
            )}
          </div>
          {pageCountReciters > 1 && paginatedReciters.length !== 0 && (
            <div style={{ textAlign: "center", margin: "22px 0" }}>
              <button style={{ padding: "7px 16px", fontSize: 16, marginRight: 8, borderRadius: 8, background: theme.card, color: theme.color, border: `1px solid ${theme.border}`, cursor: "pointer" }}
                disabled={reciterPage === 1} onClick={() => setReciterPage(reciterPage - 1)}>Prev</button>
              <span style={{ fontWeight: "bold", margin: "0 12px" }}>Page {reciterPage} / {pageCountReciters}</span>
              <button style={{ padding: "7px 16px", fontSize: 16, marginLeft: 8, borderRadius: 8, background: theme.card, color: theme.color, border: `1px solid ${theme.border}`, cursor: "pointer" }}
                disabled={reciterPage === pageCountReciters} onClick={() => setReciterPage(reciterPage + 1)}>Next</button>
            </div>
          )}
        </>
      )}

      {/* Surahs List and Player */}
      {selectedReciter && (
        <div style={{ maxWidth: 720, margin: "32px auto", background: theme.card, borderRadius: 16, boxShadow: `0 2px 18px ${theme.border}`, padding: 32 }}>
          <button style={{ marginBottom: 18, padding: "9px 22px", background: theme.accent, color: "#fff", borderRadius: 8, border: "none", fontWeight: "bold", cursor: "pointer" }}
            onClick={() => { setSelectedReciter(null); setPlayingSid(null); }}>← Back to Reciters</button>
          <h2 style={{ textAlign: "center", marginBottom: 20 }}>
            {selectedReciter.name} - {languages.find(l => l.locale === activeLang)?.native}
          </h2>
          {paginatedSurahs.length === 0 ? (
            <div style={{ textAlign: "center", color: "#d32f2f", fontSize: 18 }}>No tracks found for this reciter.</div>
          ) : (
            paginatedSurahs.map(sid => {
              const url = `${surahServer}${pad3(sid)}.mp3`;
              return (
                <div key={sid} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${theme.border}`, padding: "10px 0" }}>
                  <span><span style={{ fontWeight: "bold" }}>{surahNames[sid] ? surahNames[sid] : `Surah #${sid}`}</span></span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {playingSid === sid ? (
                      <audio autoPlay controls src={url} style={{ width: 170, maxWidth: "45vw" }} onEnded={() => setPlayingSid(null)} />
                    ) : (
                      <button style={{ padding: "4px 12px", borderRadius: 7, background: theme.accent, color: "#fff", border: "none", fontWeight: "bold", marginRight: 5, cursor: "pointer" }}
                        onClick={() => setPlayingSid(sid)}>▶ Play</button>
                    )}
                    <a href={url} download style={{ padding: "4px 8px", background: theme.accent, color: "#fff", borderRadius: 8, textDecoration: "none", fontWeight: "bold" }} title="Download mp3">⬇ Download</a>
                  </div>
                </div>
              )
            })
          )}
          {pageCountSurahs > 1 && paginatedSurahs.length !== 0 && (
            <div style={{ textAlign: "center", margin: "22px 0" }}>
              <button style={{ padding: "7px 16px", fontSize: 16, marginRight: 8, borderRadius: 8, background: theme.card, color: theme.color, border: `1px solid ${theme.border}`, cursor: "pointer" }}
                disabled={surahPage === 1} onClick={() => { setSurahPage(surahPage - 1); setPlayingSid(null); }}>Prev</button>
              <span style={{ fontWeight: "bold", margin: "0 12px" }}>Page {surahPage} / {pageCountSurahs}</span>
              <button style={{ padding: "7px 16px", fontSize: 16, marginLeft: 8, borderRadius: 8, background: theme.card, color: theme.color, border: `1px solid ${theme.border}`, cursor: "pointer" }}
                disabled={surahPage === pageCountSurahs} onClick={() => { setSurahPage(surahPage + 1); setPlayingSid(null); }}>Next</button>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <footer style={{ width: "100%", marginTop: "auto", background: theme.card, color: theme.color, textAlign: "center", padding: "26px 0 18px 0", borderTop: `1px solid ${theme.border}`, fontSize: 18 }}>
        Visitors: {visitCount} &nbsp; | &nbsp; Contact: Ahmed Aamer – <a href="mailto:ahmed.amer@mail.com" style={{ color: theme.accent, textDecoration: "underline" }}>ahmed.amer@mail.com</a>
      </footer>
    </div>
  );
}

export default App;
