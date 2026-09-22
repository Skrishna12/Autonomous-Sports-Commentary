(function () {
  const $ = (sel, el = document) => el.querySelector(sel);
  const app = $("#app");
  const state = {
    view: "hub",
    std: localStorage.getItem("cfs-std") || "as3",
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
      packQuizI: state.packQuizI,
      packQuizPicked: state.packQuizPicked,
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
        state.quizPicked = null;
        render();
        return;
      }
      if (state.view === "pack" && state.packTab === "quiz" && state.packQuizI > 0) {
        state.packQuizI -= 1;
        state.packQuizPicked = null;
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
    const order = ["as3", "indas7", "usgaap"];
    return order[(order.indexOf(state.std) + 1) % order.length];
  }

  function ans(ch) {
    return ch[state.std] || ch.as3;
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
    if (state.xp >= 180) return "CFO of the night";
    if (state.xp >= 110) return "Senior associate";
    if (state.xp >= 50) return "Article assistant";
    return "Intern";
  }

  function topbar() {
    const pct = Math.min(100, Math.round((state.xp / 200) * 100));
    const std = CFS.standards[state.std] || CFS.standards.as3;
    return `
      <div class="topbar">
        <div class="brand">
          <small>CA + US CMA Studio</small>
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
          <p class="lede">Type a topic — GST, ratios, ethics, NPV, cash flow — or upload class notes / a PDF. The studio matches CA Intermediate papers and US CMA parts, then opens official ICAI, IMA, RTP/MTP and video searches for you.</p>
          <form class="seek" id="seek-form">
            <input id="seek-input" type="search" name="q" autocomplete="off" placeholder="e.g. cash flow statement, GST ITC, standard costing…" />
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
          <div class="poster-caption">CA Inter papers 1–6 · US CMA Part 1 & 2 · official links, not random blogs first</div>
        </div>
      </section>
      <section class="modes">
        <button class="card" data-q="Cash flow statement" type="button">
          <span class="tag">FEATURED</span>
          <h3>Cash flow (game inside)</h3>
          <p>Already built as a film, classifier, lab and quiz — the first full playground.</p>
        </button>
        <button class="card" data-q="Ratio analysis" type="button">
          <span class="tag">FM / CMA P2</span>
          <h3>Ratio analysis</h3>
          <p>Liquidity, leverage, DuPont — CA 6A and CMA statement analysis.</p>
        </button>
        <button class="card" data-q="GST" type="button">
          <span class="tag">CA TAX</span>
          <h3>GST</h3>
          <p>Supply, ITC, IGST vs CGST — plus official GST portal search.</p>
        </button>
        <button class="card" data-q="Internal controls COSO" type="button">
          <span class="tag">AUDIT / CMA</span>
          <h3>Internal controls</h3>
          <p>COSO cube — CA audit paper and a CMA Part 1 heavy-hitter.</p>
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
      result = `<div class="feedback ${right === n ? "" : "wrong"}">${right}/${n} under ${CFS.standards[state.std].label}. Overdraft, interest, TDS on subsidiary interest, and 3-month paper are the ones that jump when you rotate the standard.</div>`;
    }
    return `
      <span class="kicker">Classification heist · ICAI Inter list</span>
      <h2>Put every rupee in a river</h2>
      <p class="lede">Click a chip, then a bucket. Fifth and sixth columns catch cash equivalents and non-cash items (bad debts, FX restatement, asset bought by issue of shares). Rotate AS-3 / Ind AS 7 / US GAAP in the top bar.</p>
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
      { id: "dep", label: `Add depreciation ₹${f.dep}L`, why: "Non-cash expense sitting inside PAT." },
      { id: "gain", label: `Deduct gain on van ₹${f.gainVan}L`, why: "Gain is in PAT; proceeds belong in investing." },
      { id: "int", label: `Add back interest paid ₹${f.intPaid}L (AS-3)`, why: "AS-3 shows interest as financing, so strip it from operating first." },
      { id: "wc", label: `Working capital: inv +${f.dInv}, AR +${f.dAr}, AP ${f.dAp}`, why: "₹45L absorbed. Increases in CA and fall in CL are uses of cash." },
      { id: "tax", label: `Deduct tax paid ₹${f.taxPaid}L`, why: "Tax on operations is an operating outflow." },
    ];

    let cfo = f.pat;
    if (u.dep) cfo += f.dep;
    if (u.gain) cfo -= f.gainVan;
    if (u.int) cfo += f.intPaid;
    if (u.wc) cfo -= f.dInv + f.dAr - f.dAp;
    if (u.tax) cfo -= f.taxPaid;

    const inv = -(u.plant ? f.plant : 0) + (u.van ? f.van : 0) + (u.intrec ? f.intRec : 0);
    const fin =
      (u.loan ? f.loan : 0) -
      (u.repay ? f.loanRepay : 0) -
      (u.div ? f.divPaid : 0) -
      (u.intfin ? f.intPaid : 0);
    const net = (u.opdone ? cfo : 0) + (u.invdone ? inv : 0) + (u.findone ? fin : 0);
    const close = f.openCash + (u.bridge ? net : 0);

    const row = (k, v, extra = "") =>
      `<div class="row ${extra}"><span>${k}</span><span>${v}</span></div>`;

    const ops = [
      row("Profit after tax", f.pat),
      u.dep ? row("Depreciation", `+${f.dep}`) : "",
      u.gain ? row("Gain on sale of van", `(${f.gainVan})`) : "",
      u.int ? row("Interest paid (add back, AS-3)", `+${f.intPaid}`) : "",
      u.wc ? row("Working capital absorption", `(${f.dInv + f.dAr - f.dAp})`) : "",
      u.tax ? row("Tax paid", `(${f.taxPaid})`) : "",
      u.opdone ? row("Cash from operations", cfo, "total") : "",
    ].join("");

    const invRows = [
      u.plant ? row("Plant acquired (cash)", `(${f.plant})`) : "",
      u.van ? row("Proceeds — van", f.van) : "",
      u.intrec ? row("Interest received (AS-3 investing)", f.intRec) : "",
      u.invdone ? row("Cash from investing", inv, "total") : "",
    ].join("");

    const finRows = [
      u.loan ? row("Term loan drawn", f.loan) : "",
      u.repay ? row("Loan repaid", `(${f.loanRepay})`) : "",
      u.intfin ? row("Interest paid (AS-3 financing)", `(${f.intPaid})`) : "",
      u.div ? row("Dividend paid", `(${f.divPaid})`) : "",
      u.findone ? row("Cash from financing", fin, "total") : "",
    ].join("");

    const pal = (id, label) =>
      `<button class="adj ${u[id] ? "used" : ""}" data-adj="${id}" type="button">${label}</button>`;

    const complete = u.bridge;

    return `
      <span class="kicker">Indirect method · AS-3 presentation</span>
      <h2>Write Meridian’s cash flow</h2>
      <p class="lede">PAT ₹${f.pat}L is already on the page. Apply adjustments on the right. Investing and financing still need their cash lines. Opening cash is ₹${f.openCash}L.</p>
      <div class="lab-grid">
        <div class="stmt">
          <h3>Meridian Teas · Cash Flow Statement</h3>
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
          ${pal("plant", "Plant paid ₹45L")}
          ${pal("van", "Van proceeds ₹5L")}
          ${pal("intrec", "Interest received ₹3L")}
          ${pal("invdone", "Lock cash from investing")}
          <p class="note" style="margin-top:14px">Financing cash</p>
          ${pal("loan", "Loan drawn ₹40L")}
          ${pal("repay", "Principal repaid ₹12L")}
          ${pal("intfin", "Interest paid ₹6L")}
          ${pal("div", "Dividend paid ₹8L")}
          ${pal("findone", "Lock cash from financing")}
          ${pal("bridge", "Reconcile opening → closing cash")}
          ${complete ? `<div class="feedback" style="margin-top:12px">Closing cash ₹${close}L. If this matches the cash line on the balance sheet, the statement stands. Under US GAAP, interest paid ₹6L and interest received ₹3L would both sit in operating instead.</div>` : ""}
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

  function quizView() {
    if (state.quizI >= CFS.quiz.length) {
      const pct = Math.round((state.quizScore / CFS.quiz.length) * 100);
      const badge = pct === 100 ? "Distinction" : pct >= 70 ? "Pass with heat" : "Re-sit recommended";
      return `
        <div class="ending">
          <div class="badge">${badge}</div>
          <div class="score-big">${state.quizScore}/${CFS.quiz.length}</div>
          <h2>The night’s paper</h2>
          <p class="lede" style="margin:12px auto">Cash flow is a story about timing. Replay the film or flip the standard and try the buckets again.</p>
          <div class="actions" style="justify-content:center">
            <button class="btn primary" data-go="quiz" type="button">Sit again</button>
            <button class="btn" data-back type="button">Back</button>
          </div>
        </div>`;
    }
    const item = CFS.quiz[state.quizI];
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
        <span class="kicker">Question ${state.quizI + 1} / ${CFS.quiz.length}</span>
        <h2 class="q">${item.q}</h2>
        <div class="options">${opts}</div>
        ${picked !== null ? `${quizFeedback(item, picked)}<div class="actions"><button class="btn primary" id="next-q" type="button">${state.quizI + 1 === CFS.quiz.length ? "See the score" : "Next question"}</button></div>` : ""}
      </div>`;
  }

  function bindQuiz() {
    app.querySelectorAll("[data-opt]").forEach((b) =>
      b.addEventListener("click", () => {
        if (state.quizPicked !== null) return;
        const i = Number(b.getAttribute("data-opt"));
        state.quizPicked = i;
        if (i === CFS.quiz[state.quizI].a) {
          state.quizScore += 1;
          addXp(8);
        }
        render();
      })
    );
    const n = $("#next-q");
    if (n)
      n.addEventListener("click", () => {
        state.quizI += 1;
        state.quizPicked = null;
        render();
      });
  }

  function drillView() {
    const card = CFS.flash[state.flashI];
    return `
      <span class="kicker">AS-3 para drill ${state.flashI + 1} / ${CFS.flash.length}</span>
      <h2>Quote the standard, then flip</h2>
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
      <p class="lede">These are the live ICAI / MCA / IMA pages the studio is built from. Open a PDF, come back, and try the same idea in the film or the buckets. Not a substitute for BoS study material.</p>
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
    const ca = (p.papers.ca && p.papers.ca[0]) || "the matching CA Intermediate chapter";
    const cma = (p.papers.cma && p.papers.cma[0]) || "the matching US CMA outline area";
    return {
      flash,
      quiz: [
        {
          q: `You searched “${p.query}”. Where should a CA Intermediate student open the book first?`,
          opts: [
            ca,
            "Skip ICAI and only watch random reels",
            "It is never tested in CA Intermediate",
            "Only in the income-tax return utility",
          ],
          a: 0,
          explain: `Start with ${ca}. Then use the “All CA + CMA links” tab for ICAI study material, RTP and MTP.`,
        },
        {
          q: `The same topic on the US CMA side is closest to:`,
          opts: [
            cma,
            "Indian GST returns only",
            "Companies Act board-meeting quorum only",
            "It is never in CMA",
          ],
          a: 0,
          explain: `US CMA maps this to ${cma}. Open the IMA / CMA cards on the links tab — do not mix Indian GST rules into the US paper unless the question is Indian tax.`,
        },
      ],
    };
  }

  function packView() {
    if (state.busy && !state.pack) {
      return `<p class="lede">Searching CA and US CMA resources…</p>`;
    }
    const p = state.pack;
    const topic = p.topic;
    const title = topic ? topic.title : p.query;
    const ca = (p.papers.ca || []).map((x) => `<li>${x}</li>`).join("");
    const cma = (p.papers.cma || []).map((x) => `<li>${x}</li>`).join("");
    const also = (p.also || [])
      .map((t) => `<button class="chip-topic" data-q="${t.title}" type="button">${t.title}</button>`)
      .join("");
    const tabs = ["teach", "flash", "quiz", "links"]
      .map((k) => {
        const label = { teach: "Explain", flash: "Flashcards", quiz: "Quiz", links: "All CA + CMA links" }[k];
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
      <p class="lede">${topic ? topic.blurb : "No built-in lesson for this exact title yet — papers are guessed from the words, and every official CA / CMA search below is live."}</p>
      <div class="papers">
        <div class="bucket op"><h3>CA Intermediate</h3><ul class="plain">${ca}</ul></div>
        <div class="bucket inv"><h3>US CMA</h3><ul class="plain">${cma}</ul></div>
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
      return `<p class="note">Each card opens a search already aimed at ICAI, IMA, RTP/MTP, MCA, tax portals or YouTube. Your friend only clicks.</p><section class="modes">${cards}</section>`;
    }
    if (state.packTab === "flash") {
      const cards = bank.flash;
      if (!cards.length) return `<p class="lede">No flashcards baked in for this topic yet. Open “All CA + CMA links” and use ICAI SM / IMA outline. Or pick a nearby topic chip.</p>`;
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
      if (!qs.length) return `<p class="lede">No quiz bank for this title yet. Use RTP/MTP links in the last tab — those are the real ICAI questions.</p>`;
      if (state.packQuizI >= qs.length) {
        return `<div class="ending"><div class="score-big">${state.packQuizScore}/${qs.length}</div>
          <div class="actions" style="justify-content:center"><button class="btn primary" data-tab="quiz" type="button">Again</button></div></div>`;
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
        ${picked !== null ? `${quizFeedback(item, picked)}<div class="actions"><button class="btn primary" id="pack-next-q" type="button">${state.packQuizI + 1 === qs.length ? "See the score" : "Next question"}</button></div>` : ""}
      </div>`;
    }
    const notes = ((topic && topic.notes) || []).map((n) => `<li>${n}</li>`).join("");
    const wiki = state.wiki
      ? `<div class="cheat" style="margin-top:22px"><span class="kicker">Plain-English snapshot (Wikipedia)</span>
          <h2 style="font-size:28px;margin:8px 0 10px">${state.wiki.title}</h2>
          <p class="note">${state.wiki.extract || ""}</p>
          ${state.wiki.url ? `<p><a class="btn" href="${state.wiki.url}" target="_blank" rel="noopener">Read more</a></p>` : ""}
          <p class="note">Wikipedia is a start, not an ICAI module. Use the links tab for BoS / IMA.</p>
        </div>`
      : state.busy
        ? `<p class="note">Fetching a plain-English snapshot…</p>`
        : "";
    return `
      ${notes ? `<ul class="teach">${notes}</ul>` : `<p class="lede">Use the links tab — it already searched ICAI, RTP, MTP, IMA and YouTube for “${p.query}”.</p>`}
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
        state.packQuizPicked = i;
        if (i === packBank().quiz[state.packQuizI].a) {
          state.packQuizScore += 1;
          addXp(8);
        }
        render();
      })
    );
    const nq = $("#pack-next-q");
    if (nq)
      nq.addEventListener("click", () => {
        state.packQuizI += 1;
        state.packQuizPicked = null;
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
    }     else if (state.view === "quiz") {
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
