(function () {
  const $ = (sel, el = document) => el.querySelector(sel);
  const app = $("#app");
  const state = {
    view: "hub",
    std: ["usgaap", "ifrs"].includes(localStorage.getItem("cfs-std"))
      ? localStorage.getItem("cfs-std")
      : "usgaap",
    xp: Number(localStorage.getItem("cfs-xp") || 0),
    filmI: 0,
    filmNote: "Watch, then choose. Wrong answers still teach — they just pay less XP.",
    filmFb: null,
    sortMap: {},
    sortChecked: false,
    sortAwarded: false,
    labUsed: {},
    labAwarded: false,
    quizI: 0,
    quizPicked: null,
    quizScore: 0,
    quizAnswers: [],
    flashI: 0,
    flashShow: false,
    query: "",
    pack: null,
    packTab: "teach",
    wiki: null,
    busy: false,
    packQuizI: 0,
    packQuizPicked: null,
    packQuizScore: 0,
    packQuizAnswers: [],
    packFlashI: 0,
    packFlashShow: false,
    fileHint: "",
    nav: [],
  };

  let popping = false;

  function snap() {
    return {
      view: state.view,
      packTab: state.packTab,
      pack: state.pack,
      query: state.query,
      wiki: state.wiki,
      fileHint: state.fileHint,
      filmI: state.filmI,
      filmFb: state.filmFb,
      quizI: state.quizI,
      quizPicked: state.quizPicked,
      quizAnswers: state.quizAnswers.slice(),
      packQuizI: state.packQuizI,
      packQuizPicked: state.packQuizPicked,
      packQuizAnswers: state.packQuizAnswers.slice(),
      packFlashI: state.packFlashI,
      packFlashShow: state.packFlashShow,
      flashI: state.flashI,
      flashShow: state.flashShow,
    };
  }

  function restore(s) {
    Object.keys(s).forEach((k) => {
      state[k] = s[k];
    });
  }

  function pushHist() {
    if (popping) return;
    state.nav.push(snap());
    try {
      history.pushState({ depth: state.nav.length }, "", location.pathname + location.search + "#" + state.view);
    } catch (e) {}
  }

  function go(view) {
    if (view === "hub") {
      state.nav = [];
      state.view = "hub";
      try {
        history.pushState({ depth: 0 }, "", location.pathname + location.search + "#home");
      } catch (e) {}
      render();
      return;
    }
    pushHist();
    if (view === "film") state.filmI = 0;
    if (view === "sort") {
      state.sortMap = {};
      state.sortChecked = false;
      state.sortAwarded = false;
    }
    if (view === "lab") {
      state.labUsed = {};
      state.labAwarded = false;
    }
    if (view === "quiz") {
      state.quizI = 0;
      state.quizPicked = null;
      state.quizScore = 0;
      state.quizAnswers = [];
    }
    if (view === "drill") {
      state.flashI = 0;
      state.flashShow = false;
    }
    state.view = view;
    render();
  }

  function back() {
    if (!popping) {
      if (state.view === "film" && state.filmI > 0) {
        state.filmI -= 1;
        state.filmFb = null;
        render();
        return;
      }
      if (state.view === "quiz" && state.quizI > 0) {
        state.quizI -= 1;
        state.quizPicked = state.quizAnswers[state.quizI] ?? null;
        render();
        return;
      }
      if (state.view === "pack" && state.packTab === "quiz" && state.packQuizI > 0) {
        state.packQuizI -= 1;
        state.packQuizPicked = state.packQuizAnswers[state.packQuizI] ?? null;
        render();
        return;
      }
      if (state.view === "pack" && state.packTab !== "teach") {
        state.packTab = "teach";
        render();
        return;
      }
      if (state.view === "drill" && state.flashI > 0) {
        state.flashI -= 1;
        state.flashShow = false;
        render();
        return;
      }
    }
    const prev = state.nav.pop();
    if (!prev) {
      state.view = "hub";
    } else {
      restore(prev);
    }
    render();
  }

  function leaveView() {
    popping = true;
    back();
    popping = false;
  }

  function nextStd() {
    const order = ["usgaap", "ifrs"];
    const i = Math.max(0, order.indexOf(state.std));
    return order[(i + 1) % order.length];
  }

  function ans(ch) {
    return ch[state.std] || ch.usgaap;
  }

  function save() {
    localStorage.setItem("cfs-xp", String(state.xp));
    localStorage.setItem("cfs-std", state.std);
  }

  function addXp(n) {
    state.xp += n;
    save();
  }

  function rank() {
    if (state.xp >= 180) return "Controller of the night";
    if (state.xp >= 110) return "Part 2 ready";
    if (state.xp >= 50) return "Part 1 ready";
    return "CMA candidate";
  }

  function topbar() {
    const pct = Math.min(100, Math.round((state.xp / 200) * 100));
    const std = CFS.standards[state.std] || CFS.standards.usgaap;
    return `
      <div class="topbar">
        <div class="brand">
          <small>US CMA Studio</small>
          <b>Just type the topic</b>
        </div>
        <div class="xp">
          ${state.view !== "hub" ? `<button class="btn primary" data-back type="button">← Back</button>` : ""}
          <button class="btn ghost" data-go="hub" type="button">Home</button>
          <button class="btn ghost" data-std="${nextStd()}" type="button">${std.label}</button>
          <span>${rank()} · ${state.xp} XP</span>
          <div class="meter" aria-hidden="true"><span style="width:${pct}%"></span></div>
        </div>
      </div>`;
  }

  function mount(html) {
    app.innerHTML = `<div class="wrap screen">${topbar()}${html}</div>`;
    bind();
  }

  function bind() {
    app.querySelectorAll("[data-go]").forEach((b) =>
      b.addEventListener("click", () => {
        go(b.getAttribute("data-go"));
      })
    );
    app.querySelectorAll("[data-back]").forEach((b) =>
      b.addEventListener("click", () => back())
    );
    app.querySelectorAll("[data-std]").forEach((b) =>
      b.addEventListener("click", () => {
        state.std = b.getAttribute("data-std");
        save();
        render();
      })
    );
    bindSearch();
  }

  function bindSearch() {
    const form = $("#seek-form");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const q = ($("#seek-input").value || "").trim();
        if (q) openPack(q);
      });
    }
    app.querySelectorAll("[data-q]").forEach((b) =>
      b.addEventListener("click", () => openPack(b.getAttribute("data-q")))
    );
    const file = $("#seek-file");
    if (file) file.addEventListener("change", () => handleFile(file.files && file.files[0]));
    app.querySelectorAll("[data-tab]").forEach((b) =>
      b.addEventListener("click", () => {
        state.packTab = b.getAttribute("data-tab");
        if (state.packTab === "quiz") {
          state.packQuizI = 0;
          state.packQuizPicked = null;
          state.packQuizScore = 0;
          state.packQuizAnswers = [];
        }
        if (state.packTab === "flash") {
          state.packFlashI = 0;
          state.packFlashShow = false;
        }
        render();
      })
    );
  }

  function hub() {
    const chips = TOPICS.map(
      (t) => `<button class="chip-topic" data-q="${t.title}" type="button">${t.title}</button>`
    ).join("");
    return `
      <section class="hero search-hero">
        <div>
          <span class="kicker">No login · No app install · Type like you text</span>
          <h1>What are you studying today?</h1>
          <p class="lede">Type a US CMA topic — cash flow, COSO, WACC, ethics, NPV — or upload class notes / a PDF. The studio maps it to the 2024 IMA outline (Part 1 &amp; 2), pulls a plain-English snapshot, and opens every official IMA / FASB / SEC / COSO search for you.</p>
          <form class="seek" id="seek-form">
            <input id="seek-input" type="search" name="q" autocomplete="off" placeholder="e.g. statement of cash flows, COSO, WACC…" />
            <button class="btn primary" type="submit">Find resources</button>
          </form>
          <label class="upload">
            <input id="seek-file" type="file" accept=".pdf,.txt,.md,.text" hidden />
            Or upload notes / PDF
          </label>
          <p class="note" id="seek-status"></p>
          <div class="topic-chips">${chips}</div>
        </div>
        <div class="poster" aria-hidden="true">
          <div class="river">
            <div class="cash-lane op"></div>
            <div class="cash-lane inv"></div>
            <div class="cash-lane fin"></div>
          </div>
          <div class="poster-caption">IMA CSO 2024 · Part 1 &amp; 2 · official IMA, FASB, SEC, COSO first</div>
        </div>
      </section>
      <section class="modes">
        <button class="card" data-q="Cash flow statement" type="button">
          <span class="tag">FEATURED</span>
          <h3>Cash flow (game inside)</h3>
          <p>Already built as a film, classifier, lab and quiz — the first full playground.</p>
        </button>
        <button class="card" data-q="Ratio analysis" type="button">
          <span class="tag">CMA P2</span>
          <h3>Ratio analysis</h3>
          <p>Liquidity, leverage, DuPont — Part 2 financial statement analysis.</p>
        </button>
        <button class="card" data-q="WACC cost of capital" type="button">
          <span class="tag">CMA P2</span>
          <h3>WACC &amp; capital</h3>
          <p>Cost of capital, CAPM, and capital-budgeting cousins (NPV / IRR).</p>
        </button>
        <button class="card" data-go="library" type="button">
          <span class="tag">ALL SOURCES</span>
          <h3>Resource desk</h3>
          <p>IMA CSO, LOS, handbook, ethics, FASB ASC 230, COSO, SEC — one click each.</p>
        </button>
      </section>`;
  }

  function film() {
    const sc = CFS.film[state.filmI];
    const choices = (sc.choices || [])
      .map(
        (c, i) =>
          `<button class="choice" data-choice="${i}" type="button">${c.t}</button>`
      )
      .join("");
    return `
      <div class="film">
        <div class="stage">
          <div class="stage-bg ${sc.set}"></div>
          <div class="cast">
            <div class="avatar">M</div>
            <div class="avatar">K</div>
          </div>
          <div class="scene-no">SCENE ${String(state.filmI + 1).padStart(2, "0")} / 08</div>
          <div class="dialogue">
            <div class="who">${sc.who}</div>
            <div class="line">${sc.line}</div>
            <div class="choices">${choices}</div>
          </div>
        </div>
        <aside class="sidebar">
          <div class="stat"><span>Standard</span><b>${CFS.standards[state.std].label}</b></div>
          <div class="stat"><span>XP</span><b>${state.xp}</b></div>
          <p class="note">${sc.note}</p>
          ${state.filmFb ? `<div class="feedback ${state.filmFb.ok ? "" : "wrong"}">${state.filmFb.tip}</div>` : ""}
          <p class="note">${CFS.standards[state.std].blurb}</p>
        </aside>
      </div>`;
  }

  function bindFilm() {
    app.querySelectorAll("[data-choice]").forEach((b) =>
      b.addEventListener("click", () => {
        const sc = CFS.film[state.filmI];
        const c = sc.choices[Number(b.getAttribute("data-choice"))];
        if (c.xp) addXp(c.xp);
        if (typeof c.ok === "boolean") state.filmFb = { ok: c.ok, tip: c.tip };
        else state.filmFb = null;
        if (c.next === "hub") {
          leaveView();
          return;
        }
        state.filmI = c.next;
        render();
      })
    );
  }

  function sortView() {
    const buckets = { op: [], inv: [], fin: [], ceq: [], none: [], pool: [] };
    CFS.chips.forEach((ch) => {
      const b = state.sortMap[ch.id] || "pool";
      buckets[b].push(ch);
    });
    const n = CFS.chips.length;
    const chip = (ch) => {
      let mark = "";
      if (state.sortChecked && state.sortMap[ch.id]) {
        mark = state.sortMap[ch.id] === ans(ch) ? " right" : " wrong";
      }
      return `<button class="chip${mark}" draggable="true" data-chip="${ch.id}" type="button">${ch.t}</button>`;
    };
    const bucket = (id, title, cls) =>
      `<div class="bucket ${cls}" data-bucket="${id}"><h3>${title}</h3>${buckets[id].map(chip).join("")}</div>`;
    let result = "";
    if (state.sortChecked) {
      let right = 0;
      CFS.chips.forEach((ch) => {
        if (state.sortMap[ch.id] === ans(ch)) right += 1;
      });
      result = `<div class="feedback ${right === n ? "" : "wrong"}">${right}/${n} under ${CFS.standards[state.std].label}. Interest, dividends received, overdrafts, and 3-month paper are the ones that jump when you toggle IFRS.</div>`;
    }
    return `
      <span class="kicker">Classification heist · ASC 230</span>
      <h2>Put every dollar in a river</h2>
      <p class="lede">Click a chip, then a bucket. Fifth and sixth columns catch cash equivalents and non-cash items (bad debts, FX restatement, asset bought by issue of shares). The top bar toggles US GAAP (CMA default) vs IFRS contrast.</p>
      <div class="bucket sort-top" data-bucket="pool"><h3>Unsorted</h3>${buckets.pool.map(chip).join("") || "<p class='note'>All chips placed. Mark the paper.</p>"}</div>
      <div class="buckets five">
        ${bucket("op", "Operating", "op")}
        ${bucket("inv", "Investing", "inv")}
        ${bucket("fin", "Financing", "fin")}
      </div>
      <div class="buckets" style="grid-template-columns:1fr 1fr;margin-top:12px">
        ${bucket("ceq", "Cash equivalent", "")}
        ${bucket("none", "Not a cash flow", "")}
      </div>
      <div class="actions">
        <button class="btn primary" id="check-sort" type="button">Mark the paper</button>
        <button class="btn ghost" id="reset-sort" type="button">Reset</button>
      </div>
      ${result}`;
  }

  function bindSort() {
    let held = null;
    app.querySelectorAll("[data-chip]").forEach((el) => {
      el.addEventListener("dragstart", () => {
        held = el.getAttribute("data-chip");
      });
      el.addEventListener("click", () => {
        held = el.getAttribute("data-chip");
        el.style.outline = "1px solid var(--gold)";
      });
    });
    app.querySelectorAll("[data-bucket]").forEach((el) => {
      el.addEventListener("dragover", (e) => e.preventDefault());
      el.addEventListener("drop", (e) => {
        e.preventDefault();
        const id = held || e.dataTransfer.getData("text");
        if (!id) return;
        const b = el.getAttribute("data-bucket");
        if (b === "pool") delete state.sortMap[id];
        else state.sortMap[id] = b;
        state.sortChecked = false;
        render();
      });
      el.addEventListener("click", (e) => {
        if (!held || e.target.closest("[data-chip]")) return;
        const b = el.getAttribute("data-bucket");
        if (b === "pool") delete state.sortMap[held];
        else state.sortMap[held] = b;
        held = null;
        state.sortChecked = false;
        render();
      });
    });
    const check = $("#check-sort");
    if (check)
      check.addEventListener("click", () => {
        state.sortChecked = true;
        let right = 0;
        CFS.chips.forEach((ch) => {
          if (state.sortMap[ch.id] === ans(ch)) right += 1;
        });
        if (right === CFS.chips.length && !state.sortAwarded) {
          addXp(20);
          state.sortAwarded = true;
        }
        render();
      });
    const reset = $("#reset-sort");
    if (reset)
      reset.addEventListener("click", () => {
        state.sortMap = {};
        state.sortChecked = false;
        render();
      });
  }

  function labView() {
    const f = CFS.labFacts;
    const u = state.labUsed;
    const steps = [
      { id: "dep", label: `Add depreciation $${f.dep}0,000`, why: "Non-cash expense sitting inside net income." },
      { id: "gain", label: `Deduct gain on van $${f.gainVan}0,000`, why: "Gain is in net income; proceeds belong in investing." },
      { id: "wc", label: `Working capital: inv +${f.dInv}, AR +${f.dAr}, AP ${f.dAp}`, why: "$450,000 absorbed. Increases in current assets and a fall in current liabilities use cash." },
      { id: "tax", label: `Deduct tax paid $${f.taxPaid}0,000`, why: "Income taxes paid are an operating outflow under US GAAP." },
    ];

    let cfo = f.pat;
    if (u.dep) cfo += f.dep;
    if (u.gain) cfo -= f.gainVan;
    if (u.wc) cfo -= f.dInv + f.dAr - f.dAp;
    if (u.tax) cfo -= f.taxPaid;

    const inv = -(u.plant ? f.plant : 0) + (u.van ? f.van : 0);
    const fin =
      (u.loan ? f.loan : 0) -
      (u.repay ? f.loanRepay : 0) -
      (u.div ? f.divPaid : 0);
    const net = (u.opdone ? cfo : 0) + (u.invdone ? inv : 0) + (u.findone ? fin : 0);
    const close = f.openCash + (u.bridge ? net : 0);

    const row = (k, v, extra = "") =>
      `<div class="row ${extra}"><span>${k}</span><span>${v}</span></div>`;

    const ops = [
      row("Net income", f.pat),
      u.dep ? row("Depreciation", `+${f.dep}`) : "",
      u.gain ? row("Gain on sale of van", `(${f.gainVan})`) : "",
      u.wc ? row("Working capital absorption", `(${f.dInv + f.dAr - f.dAp})`) : "",
      u.tax ? row("Tax paid", `(${f.taxPaid})`) : "",
      u.opdone ? row("Cash from operations", cfo, "total") : "",
    ].join("");

    const invRows = [
      u.plant ? row("Plant acquired (cash)", `(${f.plant})`) : "",
      u.van ? row("Proceeds — van", f.van) : "",
      u.invdone ? row("Cash from investing", inv, "total") : "",
    ].join("");

    const finRows = [
      u.loan ? row("Term loan drawn", f.loan) : "",
      u.repay ? row("Loan repaid", `(${f.loanRepay})`) : "",
      u.div ? row("Dividend paid", `(${f.divPaid})`) : "",
      u.findone ? row("Cash from financing", fin, "total") : "",
    ].join("");

    const pal = (id, label) =>
      `<button class="adj ${u[id] ? "used" : ""}" data-adj="${id}" type="button">${label}</button>`;

    const complete = u.bridge;

    return `
      <span class="kicker">Indirect method · US GAAP (ASC 230)</span>
      <h2>Write Meridian’s cash flow</h2>
      <p class="lede">Net income $${f.pat}0,000 is already on the page. Apply adjustments on the right. Interest paid and interest received stay in operating under US GAAP (already in net income). Opening cash is $${f.openCash}0,000.</p>
      <div class="lab-grid">
        <div class="stmt">
          <h3>Meridian Teas · Statement of Cash Flows</h3>
          <div class="row total"><span>A. Operating activities</span><span></span></div>
          ${ops || '<div class="row"><span>Awaiting adjustments…</span><span></span></div>'}
          <div class="row total"><span>B. Investing activities</span><span></span></div>
          ${invRows || '<div class="row"><span>Awaiting cash lines…</span><span></span></div>'}
          <div class="row total"><span>C. Financing activities</span><span></span></div>
          ${finRows || '<div class="row"><span>Awaiting cash lines…</span><span></span></div>'}
          ${u.bridge ? row("Net increase / (decrease)", net, "total") : ""}
          ${u.bridge ? row("Opening cash & cash equivalents", f.openCash) : ""}
          ${u.bridge ? row("Closing cash & cash equivalents", close, "total") : ""}
        </div>
        <div>
          <p class="note">Operating bridge</p>
          <div class="palettes">${steps.map((s) => pal(s.id, s.label)).join("")}</div>
          <p class="note" style="margin-top:14px">Lock operating total when the bridge feels complete</p>
          ${pal("opdone", "Lock cash from operations")}
          <p class="note" style="margin-top:14px">Investing cash</p>
          ${pal("plant", "Plant paid $450,000")}
          ${pal("van", "Van proceeds $50,000")}
          ${pal("invdone", "Lock cash from investing")}
          <p class="note" style="margin-top:14px">Financing cash</p>
          ${pal("loan", "Loan drawn $400,000")}
          ${pal("repay", "Principal repaid $120,000")}
          ${pal("div", "Dividend paid $80,000")}
          ${pal("findone", "Lock cash from financing")}
          ${pal("bridge", "Reconcile opening → closing cash")}
          ${complete ? `<div class="feedback" style="margin-top:12px">Closing cash $${close}0,000. If this matches the cash line on the balance sheet, the statement stands. IFRS contrast: interest paid and interest received could be moved out of operating with a consistent policy.</div>` : ""}
        </div>
      </div>`;
  }

  function bindLab() {
    app.querySelectorAll("[data-adj]").forEach((b) =>
      b.addEventListener("click", () => {
        state.labUsed[b.getAttribute("data-adj")] = true;
        if (b.getAttribute("data-adj") === "bridge" && !state.labAwarded) {
          addXp(30);
          state.labAwarded = true;
        }
        render();
      })
    );
  }

  function quizFeedback(item, picked) {
    const right = item.opts[item.a];
    if (picked === item.a) {
      return `<div class="feedback why-box"><strong>Correct.</strong> ${item.explain}</div>`;
    }
    return `<div class="feedback wrong why-box"><strong>Wrong.</strong> Right answer: <span class="right-ans">${right}</span>. ${item.explain}</div>`;
  }

  function quizNav(i, total, picked, prevId, nextId) {
    const prev =
      i > 0
        ? `<button class="btn" id="${prevId}" type="button">← Previous question</button>`
        : "";
    const next =
      picked !== null
        ? `<button class="btn primary" id="${nextId}" type="button">${i + 1 >= total ? "See the score" : "Next question"}</button>`
        : "";
    if (!prev && !next) return "";
    return `<div class="actions quiz-nav">${prev}${next}</div>`;
  }

  function scoreOf(answers, bank) {
    return bank.reduce((n, q, i) => n + (answers[i] === q.a ? 1 : 0), 0);
  }

  function quizView() {
    const bank = CFS.quiz;
    state.quizScore = scoreOf(state.quizAnswers, bank);
    if (state.quizI >= bank.length) {
      const pct = Math.round((state.quizScore / bank.length) * 100);
      const badge = pct === 100 ? "Distinction" : pct >= 70 ? "Pass with heat" : "Re-sit recommended";
      return `
        <div class="ending">
          <div class="badge">${badge}</div>
          <div class="score-big">${state.quizScore}/${bank.length}</div>
          <h2>The night’s paper</h2>
          <p class="lede" style="margin:12px auto">Cash flow is a story about timing. Replay the film or flip the standard and try the buckets again.</p>
          <div class="actions quiz-nav" style="justify-content:center">
            <button class="btn" id="prev-q" type="button">← Previous question</button>
            <button class="btn primary" data-go="quiz" type="button">Sit again</button>
          </div>
        </div>`;
    }
    const item = bank[state.quizI];
    const picked = state.quizPicked;
    const opts = item.opts
      .map((o, i) => {
        let cls = "opt";
        if (picked !== null) {
          if (i === item.a) cls += " correct";
          else if (i === picked) cls += " incorrect";
        }
        return `<button class="${cls}" data-opt="${i}" type="button" ${picked !== null ? "disabled" : ""}>${o}</button>`;
      })
      .join("");
    return `
      <div class="quiz">
        <span class="kicker">Question ${state.quizI + 1} / ${bank.length}</span>
        <h2 class="q">${item.q}</h2>
        <div class="options">${opts}</div>
        ${picked !== null ? quizFeedback(item, picked) : ""}
        ${quizNav(state.quizI, bank.length, picked, "prev-q", "next-q")}
      </div>`;
  }

  function bindQuiz() {
    app.querySelectorAll("[data-opt]").forEach((b) =>
      b.addEventListener("click", () => {
        if (state.quizPicked !== null) return;
        const i = Number(b.getAttribute("data-opt"));
        const first = state.quizAnswers[state.quizI] === undefined;
        state.quizPicked = i;
        state.quizAnswers[state.quizI] = i;
        if (first && i === CFS.quiz[state.quizI].a) addXp(8);
        state.quizScore = scoreOf(state.quizAnswers, CFS.quiz);
        render();
      })
    );
    const n = $("#next-q");
    if (n)
      n.addEventListener("click", () => {
        state.quizI += 1;
        state.quizPicked = state.quizAnswers[state.quizI] ?? null;
        render();
      });
    const p = $("#prev-q");
    if (p)
      p.addEventListener("click", () => {
        if (state.quizI >= CFS.quiz.length) state.quizI = CFS.quiz.length - 1;
        else state.quizI -= 1;
        state.quizPicked = state.quizAnswers[state.quizI] ?? null;
        render();
      });
  }

  function drillView() {
    const card = CFS.flash[state.flashI];
    return `
      <span class="kicker">ASC 230 drill ${state.flashI + 1} / ${CFS.flash.length}</span>
      <h2>Quote the rule, then flip</h2>
      <button class="flash" id="flip-card" type="button">
        <div class="tag">${state.flashShow ? "ANSWER" : "PROMPT"}</div>
        <p>${state.flashShow ? card.b : card.f}</p>
      </button>
      <div class="actions">
        <button class="btn" id="prev-card" type="button">Back</button>
        <button class="btn primary" id="next-card" type="button">Next para</button>
      </div>`;
  }

  function bindDrill() {
    const flip = $("#flip-card");
    if (flip)
      flip.addEventListener("click", () => {
        state.flashShow = !state.flashShow;
        if (state.flashShow) addXp(2);
        render();
      });
    const n = $("#next-card");
    if (n)
      n.addEventListener("click", () => {
        state.flashI = (state.flashI + 1) % CFS.flash.length;
        state.flashShow = false;
        render();
      });
    const p = $("#prev-card");
    if (p)
      p.addEventListener("click", () => {
        state.flashI = (state.flashI - 1 + CFS.flash.length) % CFS.flash.length;
        state.flashShow = false;
        render();
      });
  }

  function libraryView() {
    const cards = CFS.resources
      .map(
        (r) => `
        <a class="card res" href="${r.href}" target="_blank" rel="noopener noreferrer">
          <span class="tag">${r.tag}</span>
          <h3>${r.t}</h3>
          <p>${r.d}</p>
        </a>`
      )
      .join("");
    return `
      <span class="kicker">Resource desk</span>
      <h2>Read the source, then play</h2>
      <p class="lede">These are the live IMA / FASB / COSO / SEC pages the studio is built from. Open a PDF, come back, and try the same idea in the film or the buckets. Not a substitute for the CMA Handbook or CSO.</p>
      <section class="modes">${cards}</section>`;
  }

  async function openPack(q, fileHint) {
    pushHist();
    state.query = q;
    state.fileHint = fileHint || "";
    state.packTab = "teach";
    state.busy = true;
    state.wiki = null;
    state.view = "pack";
    state.pack = Engine.packFromQuery(q, fileHint);
    render();
    state.wiki = await Engine.wiki(q);
    state.busy = false;
    render();
  }

  function loadPdfJs() {
    return new Promise((resolve, reject) => {
      if (window.pdfjsLib) return resolve(window.pdfjsLib);
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      s.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        resolve(window.pdfjsLib);
      };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function textFromPdf(file) {
    const pdfjs = await loadPdfJs();
    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    const max = Math.min(doc.numPages, 8);
    let text = "";
    for (let i = 1; i <= max; i += 1) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((it) => it.str).join(" ") + " ";
    }
    return text;
  }

  async function handleFile(file) {
    if (!file) return;
    const status = $("#seek-status");
    if (status) status.textContent = "Reading " + file.name + "…";
    try {
      let text = "";
      if (/\.pdf$/i.test(file.name) || file.type === "application/pdf") text = await textFromPdf(file);
      else text = await file.text();
      const slice = text.slice(0, 4000);
      const q = Engine.tokens(slice).slice(0, 12).join(" ") || file.name.replace(/\.[^.]+$/, "");
      await openPack(q, file.name);
    } catch (err) {
      if (status) status.textContent = "Could not read that file. Type the topic instead — even one word is enough.";
    }
  }

  function packBank() {
    const t = state.pack && state.pack.topic;
    if (t && t.studio === "cfs") return { quiz: CFS.quiz, flash: CFS.flash };
    const quiz = (t && t.quiz) || [];
    const flash = (t && t.flash) || [];
    if (quiz.length) return { quiz, flash };
    const p = state.pack;
    const p1 = (p.papers.p1 && p.papers.p1[0]) || "Part 1 — check the IMA Content Specification Outline";
    const p2 = (p.papers.p2 && p.papers.p2[0]) || "Part 2 — check the IMA Content Specification Outline";
    return {
      flash,
      quiz: [
        {
          q: `You searched “${p.query}”. Where should a US CMA candidate open the outline first?`,
          opts: [
            p1,
            "Skip IMA and only watch random reels",
            "It is never tested on the CMA exam",
            "Only on the US individual tax return (Form 1040)",
          ],
          a: 0,
          explain: `Start with ${p1}. Then use the “All US CMA resources” tab for IMA CSO, LOS, handbook, FASB, SEC and review-course searches.`,
        },
        {
          q: `If this topic also shows up on Part 2, the closest CSO bucket is:`,
          opts: [
            p2,
            "The IMA ethics statement only — never elsewhere",
            "SOX Section 404 only, with no CSO mapping",
            "It is never in CMA Part 2",
          ],
          a: 0,
          explain: `The studio maps this to ${p2}. Open the IMA / FASB / COSO cards on the links tab.`,
        },
      ],
    };
  }

  function packView() {
    if (state.busy && !state.pack) {
      return `<p class="lede">Searching US CMA resources (IMA, FASB, SEC, COSO)…</p>`;
    }
    const p = state.pack;
    const topic = p.topic;
    const title = topic ? topic.title : p.query;
    const p1 = (p.papers.p1 || []).map((x) => `<li>${x}</li>`).join("");
    const p2 = (p.papers.p2 || []).map((x) => `<li>${x}</li>`).join("");
    const also = (p.also || [])
      .map((t) => `<button class="chip-topic" data-q="${t.title}" type="button">${t.title}</button>`)
      .join("");
    const tabs = ["teach", "flash", "quiz", "links"]
      .map((k) => {
        const label = { teach: "Explain", flash: "Flashcards", quiz: "Quiz", links: "All US CMA resources" }[k];
        return `<button class="btn ${state.packTab === k ? "primary" : "ghost"}" data-tab="${k}" type="button">${label}</button>`;
      })
      .join("");
    const studio =
      topic && topic.studio === "cfs"
        ? `<div class="actions">
            <button class="btn primary" data-go="film" type="button">Play the cash-flow film</button>
            <button class="btn" data-go="sort" type="button">Classification game</button>
            <button class="btn" data-go="lab" type="button">Statement lab</button>
          </div>`
        : "";
    return `
      <span class="kicker">${p.fileHint ? "From your file · " + p.fileHint : "Study pack"}</span>
      <h2>${title}</h2>
      <p class="lede">${topic ? topic.blurb : "No built-in lesson for this exact title yet — the 2024 IMA outline is guessed from the words, and every official US CMA search below is live."}</p>
      <div class="papers">
        <div class="bucket op"><h3>CMA Part 1</h3><ul class="plain">${p1 || "<li>Check the IMA CSO</li>"}</ul></div>
        <div class="bucket inv"><h3>CMA Part 2</h3><ul class="plain">${p2 || "<li>Check the IMA CSO</li>"}</ul></div>
      </div>
      ${studio}
      ${also ? `<p class="note" style="margin-top:16px">Nearby topics</p><div class="topic-chips">${also}</div>` : ""}
      <div class="actions" style="margin-top:22px">${tabs}</div>
      <div class="pack-body">${packTabBody()}</div>`;
  }

  function packTabBody() {
    const p = state.pack;
    const topic = p.topic;
    const bank = packBank();
    if (state.packTab === "links") {
      const cards = p.portals
        .map(
          (r) => `
          <a class="card res" href="${r.href}" target="_blank" rel="noopener noreferrer">
            <span class="tag">${r.tag}</span>
            <h3>${r.t}</h3>
            <p>${r.d}</p>
          </a>`
        )
        .join("");
      return `<p class="note">Each card opens a live search aimed at IMA, the 2024 CSO/LOS, the handbook, FASB, SEC EDGAR, COSO, IFRS vs GAAP, Gleim/Wiley/Surgent/HOCK, and YouTube. Your friend only clicks.</p><section class="modes">${cards}</section>`;
    }
    if (state.packTab === "flash") {
      const cards = bank.flash;
      if (!cards.length) return `<p class="lede">No flashcards baked in for this topic yet. Open “All US CMA resources” and use the IMA outline. Or pick a nearby topic chip.</p>`;
      const card = cards[state.packFlashI % cards.length];
      return `
        <span class="kicker">${(state.packFlashI % cards.length) + 1} / ${cards.length}</span>
        <button class="flash" id="pack-flip" type="button">
          <div class="tag">${state.packFlashShow ? "ANSWER" : "PROMPT"}</div>
          <p>${state.packFlashShow ? card.b : card.f}</p>
        </button>
        <div class="actions">
          <button class="btn" id="pack-prev-f" type="button">Back</button>
          <button class="btn primary" id="pack-next-f" type="button">Next</button>
        </div>`;
    }
    if (state.packTab === "quiz") {
      const qs = bank.quiz;
      if (!qs.length) return `<p class="lede">No quiz bank for this title yet. Use the practice MCQ and essay searches in the last tab — those pull US CMA review sources.</p>`;
      if (state.packQuizI >= qs.length) {
        state.packQuizScore = scoreOf(state.packQuizAnswers, qs);
        return `<div class="ending"><div class="score-big">${state.packQuizScore}/${qs.length}</div>
          <div class="actions quiz-nav" style="justify-content:center">
            <button class="btn" id="pack-prev-q" type="button">← Previous question</button>
            <button class="btn primary" data-tab="quiz" type="button">Again</button>
          </div></div>`;
      }
      const item = qs[state.packQuizI];
      const picked = state.packQuizPicked;
      const opts = item.opts
        .map((o, i) => {
          let cls = "opt";
          if (picked !== null) {
            if (i === item.a) cls += " correct";
            else if (i === picked) cls += " incorrect";
          }
          return `<button class="${cls}" data-pack-opt="${i}" type="button" ${picked !== null ? "disabled" : ""}>${o}</button>`;
        })
        .join("");
      return `<div class="quiz">
        <span class="kicker">Question ${state.packQuizI + 1} / ${qs.length}</span>
        <h2 class="q">${item.q}</h2>
        <div class="options">${opts}</div>
        ${picked !== null ? quizFeedback(item, picked) : ""}
        ${quizNav(state.packQuizI, qs.length, picked, "pack-prev-q", "pack-next-q")}
      </div>`;
    }
    const notes = ((topic && topic.notes) || []).map((n) => `<li>${n}</li>`).join("");
    const related = ((state.wiki && state.wiki.related) || [])
      .map((r) => `<a class="chip-topic" href="${r.url}" target="_blank" rel="noopener">${r.title}</a>`)
      .join("");
    const wiki =
      state.wiki && (state.wiki.title || state.wiki.extract)
      ? `<div class="cheat" style="margin-top:22px"><span class="kicker">Plain-English snapshot (Wikipedia)</span>
          <h2 style="font-size:28px;margin:8px 0 10px">${state.wiki.title}</h2>
          <p class="note">${state.wiki.extract || ""}</p>
          ${state.wiki.url ? `<p><a class="btn" href="${state.wiki.url}" target="_blank" rel="noopener">Read more</a></p>` : ""}
          ${related ? `<p class="note" style="margin-top:12px">Related pages</p><div class="topic-chips">${related}</div>` : ""}
          <p class="note">Wikipedia is a start, not the CMA exam. Use the links tab for IMA CSO / LOS / FASB.</p>
        </div>`
      : state.busy
        ? `<p class="note">Fetching a plain-English snapshot…</p>`
        : "";
    return `
      ${notes ? `<ul class="teach">${notes}</ul>` : `<p class="lede">Use the links tab — it already searched IMA, FASB, SEC, COSO, review courses and YouTube for “${p.query}”.</p>`}
      ${wiki}`;
  }

  function bindPack() {
    const flip = $("#pack-flip");
    if (flip)
      flip.addEventListener("click", () => {
        state.packFlashShow = !state.packFlashShow;
        if (state.packFlashShow) addXp(2);
        render();
      });
    const nf = $("#pack-next-f");
    if (nf)
      nf.addEventListener("click", () => {
        const n = packBank().flash.length || 1;
        state.packFlashI = (state.packFlashI + 1) % n;
        state.packFlashShow = false;
        render();
      });
    const pf = $("#pack-prev-f");
    if (pf)
      pf.addEventListener("click", () => {
        const n = packBank().flash.length || 1;
        state.packFlashI = (state.packFlashI - 1 + n) % n;
        state.packFlashShow = false;
        render();
      });
    app.querySelectorAll("[data-pack-opt]").forEach((b) =>
      b.addEventListener("click", () => {
        if (state.packQuizPicked !== null) return;
        const i = Number(b.getAttribute("data-pack-opt"));
        const first = state.packQuizAnswers[state.packQuizI] === undefined;
        state.packQuizPicked = i;
        state.packQuizAnswers[state.packQuizI] = i;
        const bank = packBank().quiz;
        if (first && i === bank[state.packQuizI].a) addXp(8);
        state.packQuizScore = scoreOf(state.packQuizAnswers, bank);
        render();
      })
    );
    const nq = $("#pack-next-q");
    if (nq)
      nq.addEventListener("click", () => {
        state.packQuizI += 1;
        state.packQuizPicked = state.packQuizAnswers[state.packQuizI] ?? null;
        render();
      });
    const pq = $("#pack-prev-q");
    if (pq)
      pq.addEventListener("click", () => {
        const n = packBank().quiz.length;
        if (state.packQuizI >= n) state.packQuizI = n - 1;
        else state.packQuizI -= 1;
        state.packQuizPicked = state.packQuizAnswers[state.packQuizI] ?? null;
        render();
      });
  }

  function render() {
    if (state.view === "hub") mount(hub());
    else if (state.view === "film") {
      mount(film());
      bindFilm();
    } else if (state.view === "sort") {
      mount(sortView());
      bindSort();
    } else if (state.view === "lab") {
      mount(labView());
      bindLab();
    } else if (state.view === "quiz") {
      mount(quizView());
      bindQuiz();
    } else if (state.view === "drill") {
      mount(drillView());
      bindDrill();
    } else if (state.view === "library") {
      mount(libraryView());
    } else if (state.view === "pack") {
      mount(packView());
      bindPack();
    }
  }

  window.addEventListener("popstate", () => {
    popping = true;
    back();
    popping = false;
  });

  render();
})();
