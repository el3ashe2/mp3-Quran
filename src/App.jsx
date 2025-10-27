import React, { useEffect, useState } from "react";
import axios from "axios";

const PAGE_SIZE_RECITERS = 20;
const PAGE_SIZE_SURAHS = 20;
function pad3(n) {
  return n.toString().padStart(3, "0");
}

const DARK = {
  background: "#181a1b",
  color: "#f1f1f1",
  card: "#222426",
  accent: "#0bb3c8",
  input: "#282b2c",
  border: "#444446",
};
const LIGHT = {
  background: "#fafbfc",
  color: "#181a1b",
  card: "#fff",
  accent: "#0bb3c8",
  input: "#fafbfc",
  border: "#ddd",
};

// Replace these with your CounterAPI details
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

  const [visitCount, setVisitCount] = useState(0);

  // Visitor counter with CounterAPI
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

  // Languages fetch and code extraction
  useEffect(() => {
    axios.get("https://www.mp3quran.net/api/v3/languages").then((res) => {
      const langs = res.data.language || [];
      const fixedLangs = langs.map((l) => {
        const recitersUrl = l.reciters || "";
        const codeMatch = recitersUrl.match(/language=([a-z]+)/i);
        const code = codeMatch ? codeMatch[1] : l.language.toLowerCase();
        return {
          ...l,
          code,
        };
      });
      setLanguages(fixedLangs);
      if (fixedLangs.length > 0) setActiveLang(fixedLangs[0].code);
    });
  }, []);

  // Fetch reciters and surah names on language change
  useEffect(() => {
    setSelectedReciter(null);
    setReciterPage(1);
    setSurahPage(1);
    setSearch("");
    if (!activeLang) return;
    axios
      .get(`https://www.mp3quran.net/api/v3/reciters?language=${activeLang}`)
      .then((res) => {
        const recitersArr = Array.isArray(res.data.reciters) ? res.data.reciters : [];
        setReciters(recitersArr);
        setFilteredReciters(recitersArr);
      });
    axios
      .get(`https://www.mp3quran.net/api/v3/suwar?language=${activeLang}`)
      .then((r) => {
        const names = {};
        const suwarArr = Array.isArray(r.data.suwar) ? r.data.suwar : [];
        suwarArr.forEach((s) => {
          names[s.id] = s.name;
        });
        setSurahNames(names);
      });
  }, [activeLang]);

  // Filter reciters by search
  useEffect(() => {
    setReciterPage(1);
    if (!search) {
      setFilteredReciters(reciters);
    } else {
      setFilteredReciters(
        (reciters || []).filter(
          (r) => r.name && r.name.toLowerCase().includes(search.toLowerCase())
        )
      );
    }
  }, [search, reciters]);

  const lastReciter = reciterPage * PAGE_SIZE_RECITERS;
  const firstReciter = lastReciter - PAGE_SIZE_RECITERS;
  const paginatedReciters = (filteredReciters || []).slice(firstReciter, lastReciter);
  const pageCountReciters = Math.max(1, Math.ceil((filteredReciters || []).length / PAGE_SIZE_RECITERS));

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
    <div
      style={{
        fontFamily: "Segoe UI,Arial,sans-serif",
        minHeight: "100vh",
        background: theme.background,
        color: theme.color,
        position: "relative",
        paddingBottom: "40px",
      }}
    >
      <div style={{ textAlign: "center", margin: "20px 0" }}>
        <h1 style={{ margin: 0 }}>MP3 Quran Player</h1>
        <button
          style={{
            position: "absolute",
            top: 25,
            right: 32,
            padding: "8px 18px",
            background: theme.accent,
            color: "#fff",
            borderRadius: 12,
            border: "none",
            fontWeight: "bold",
            fontSize: 16,
            cursor: "pointer",
          }}
          onClick={() => setDarkMode((m) => !m)}
        >
          {darkMode ? "☀️ Light" : "🌙 Dark"}
        </button>
      </div>

      {!selectedReciter && (
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <select
            style={{
              fontSize: 18,
              padding: "8px 16px",
              borderRadius: 8,
              background: theme.input,
              color: theme.color,
              border: `1px solid ${theme.border}`,
              marginRight: 16,
              marginTop: 6,
            }}
            value={activeLang}
            onChange={(e) => setActiveLang(e.target.value)}
          >
            {languages.map((lang) => (
              <option key={lang.id} value={lang.code}>
                {lang.native} ({lang.code})
              </option>
            ))}
          </select>
          <input
            style={{
              fontSize: 18,
              padding: "8px 16px",
              borderRadius: 8,
              background: theme.input,
              color: theme.color,
              border: `1px solid ${theme.border}`,
              width: 220,
            }}
            placeholder="Search reciters"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {!selectedReciter && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
              gap: 28,
              margin: "0 auto",
              maxWidth: 1100,
            }}
          >
            {paginatedReciters.length === 0 ? (
              <div style={{ gridColumn: "1/-1", textAlign: "center", color: "#d32f2f", fontSize: 20 }}>
                No reciters found for this language.
              </div>
            ) : (
              paginatedReciters.map((rec) => (
                <div
                  key={rec.id}
                  style={{
                    background: theme.card,
                    boxShadow: `0 2px 8px ${theme.border}`,
                    borderRadius: 16,
                    padding: 16,
                    textAlign: "center",
                    transition: "0.2s",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    setSelectedReciter(rec);
                    setSurahPage(1);
                    setPlayingSid(null);
                  }}
                >
                  <img
                    src={rec.image && rec.image !== "" ? `https://www.mp3quran.net/images/${rec.image}` : "/logo512.png"}
                    alt={rec.name}
                    style={{
                      width: 90,
                      height: 90,
                      borderRadius: "50%",
                      marginBottom: 10,
                      objectFit: "cover",
                      background: "#f1f1f1",
                    }}
                    loading="lazy"
                    onError={(e) => {
                      e.target.src = "/logo512.png";
                    }}
                  />
                  <div style={{ fontWeight: "bold", fontSize: 16, marginBottom: 4 }}>{rec.name}</div>
                  <div style={{ color: theme.accent, fontSize: 14 }}>{rec.letter}</div>
                </div>
              ))
            )}
          </div>
          {pageCountReciters > 1 && paginatedReciters.length !== 0 && (
            <div style={{ textAlign: "center", margin: "22px 0" }}>
              <button
                style={{
                  padding: "7px 16px",
                  fontSize: 16,
                  marginRight: 8,
                  borderRadius: 8,
                  background: theme.card,
                  color: theme.color,
                  border: `1px solid ${theme.border}`,
                  cursor: "pointer",
                }}
                disabled={reciterPage === 1}
                onClick={() => setReciterPage(reciterPage - 1)}
              >
                Prev
              </button>
              <span style={{ fontWeight: "bold", margin: "0 12px" }}>
                Page {reciterPage} / {pageCountReciters}
              </span>
              <button
                style={{
                  padding: "7px 16px",
                  fontSize: 16,
                  marginLeft: 8,
                  borderRadius: 8,
                  background: theme.card,
                  color: theme.color,
                  border: `1px solid ${theme.border}`,
                  cursor: "pointer",
                }}
                disabled={reciterPage === pageCountReciters}
                onClick={() => setReciterPage(reciterPage + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {selectedReciter && (
        <div
          style={{
            maxWidth: 720,
            margin: "32px auto",
            background: theme.card,
            borderRadius: 16,
            boxShadow: `0 2px 18px ${theme.border}`,
            padding: 32,
          }}
        >
          <button
            style={{
              marginBottom: 18,
              padding: "9px 22px",
              background: theme.accent,
              color: "#fff",
              borderRadius: 8,
              border: "none",
              fontWeight: "bold",
              cursor: "pointer",
            }}
            onClick={() => {
              setSelectedReciter(null);
              setPlayingSid(null);
            }}
          >
            ← Back to Reciters
          </button>
          <h2 style={{ textAlign: "center", marginBottom: 20 }}>
            <img
              src={
                selectedReciter.image && selectedReciter.image !== ""
                  ? `https://www.mp3quran.net/images/${selectedReciter.image}`
                  : "/logo192.png"
              }
              alt={selectedReciter.name}
              style={{ width: 70, height: 70, borderRadius: "50%", verticalAlign: "middle", marginRight: 10, objectFit: "cover" }}
            />
            {selectedReciter.name} - {languages.find((l) => l.language === activeLang)?.native}
          </h2>
          {paginatedSurahs.length === 0 ? (
            <div style={{ textAlign: "center", color: "#d32f2f", fontSize: 18 }}>No tracks found for this reciter.</div>
          ) : (
            paginatedSurahs.map((sid) => {
              const url = `${selectedReciter.moshaf[0].server}${pad3(sid)}.mp3`;
              return (
                <div
                  key={sid}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: `1px solid ${theme.border}`,
                    padding: "10px 0",
                  }}
                >
                  <span>
                    <span style={{ fontWeight: "bold" }}>{surahNames[sid] ? surahNames[sid] : `Surah #${sid}`}</span>
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {playingSid === sid ? (
                      <audio
                        autoPlay
                        controls
                        src={url}
                        style={{ width: 170, maxWidth: "45vw" }}
                        onEnded={() => setPlayingSid(null)}
                      />
                    ) : (
                      <button
                        style={{
                          padding: "4px 12px",
                          borderRadius: 7,
                          background: theme.accent,
                          color: "#fff",
                          border: "none",
                          fontWeight: "bold",
                          marginRight: 5,
                          cursor: "pointer",
                        }}
                        onClick={() => setPlayingSid(sid)}
                      >
                        ▶ Play
                      </button>
                    )}
                    <a
                      href={url}
                      download
                      style={{
                        padding: "4px 8px",
                        background: theme.accent,
                        color: "#fff",
                        borderRadius: 8,
                        textDecoration: "none",
                        fontWeight: "bold",
                      }}
                      title="Download mp3"
                    >
                      ⬇ Download
                    </a>
                  </div>
                </div>
              );
            })
          )}
          {pageCountSurahs > 1 && paginatedSurahs.length !== 0 && (
            <div style={{ textAlign: "center", margin: "22px 0" }}>
              <button
                style={{
                  padding: "7px 16px",
                  fontSize: 16,
                  marginRight: 8,
                  borderRadius: 8,
                  background: theme.card,
                  color: theme.color,
                  border: `1px solid ${theme.border}`,
                  cursor: "pointer",
                }}
                disabled={surahPage === 1}
                onClick={() => {
                  setSurahPage(surahPage - 1);
                  setPlayingSid(null);
                }}
              >
                Prev
              </button>
              <span style={{ fontWeight: "bold", margin: "0 12px" }}>
                Page {surahPage} / {pageCountSurahs}
              </span>
              <button
                style={{
                  padding: "7px 16px",
                  fontSize: 16,
                  marginLeft: 8,
                  borderRadius: 8,
                  background: theme.card,
                  color: theme.color,
                  border: `1px solid ${theme.border}`,
                  cursor: "pointer",
                }}
                disabled={surahPage === pageCountSurahs}
                onClick={() => {
                  setSurahPage(surahPage + 1);
                  setPlayingSid(null);
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      <footer
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: theme.card,
          borderTop: `1px solid ${theme.border}`,
          padding: "10px",
          textAlign: "center",
          color: theme.accent,
          fontWeight: "bold",
          fontSize: 14,
          userSelect: "none",
        }}
      >
        Visitors: {visitCount} &nbsp; | &nbsp; Contact: Ahmed Aamer –{" "}
        <a href="mailto:ahmed.amer@mail.com" style={{ color: theme.accent, textDecoration: "underline" }}>
          ahmed.amer@mail.com
        </a>
      </footer>
    </div>
  );
}

export default App;
