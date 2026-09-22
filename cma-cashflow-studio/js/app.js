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
  };

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
          <small>Cashflow Confidential</small>
          <b>CMA / CA Studio</b>
        </div>
        <div class="xp">
          <button class="btn ghost" data-go="hub" type="button">Lobby</button>
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
        const v = b.getAttribute("data-go");
        if (v === "film") state.filmI = 0;
        if (v === "sort") {
          state.sortMap = {};
          state.sortChecked = false;
          state.sortAwarded = false;
        }
        if (v === "lab") {
          state.labUsed = {};
          state.labAwarded = false;
        }
        if (v === "quiz") {
          state.quizI = 0;
          state.quizPicked = null;
          state.quizScore = 0;
        }
        if (v === "drill") {
          state.flashI = 0;
          state.flashShow = false;
        }
        state.view = v;
        render();
      })
    );
    app.querySelectorAll("[data-std]").forEach((b) =>
      b.addEventListener("click", () => {
        state.std = b.getAttribute("data-std");
        save();
        render();
      })
    );
  }

  function hub() {
    return `
      <section class="hero">
        <div>
          <span class="kicker">Episode 01 · Statement of cash flows</span>
          <h1>Profit is a rumour.<br/>Cash is a fact.</h1>
          <p class="lede">CA Intermediate cash flow (AS-3) plus the Ind AS 7 and US CMA (ASC 230) traps. Built from ICAI’s standard, BoS lecture notes, and typical Inter classification papers — then turned into a film, a game, a lab and a quiz.</p>
          <div class="actions">
            <button class="btn primary" data-go="film" type="button">Play the short film</button>
            <button class="btn" data-go="library" type="button">CA resource desk</button>
          </div>
        </div>
        <div class="poster" aria-hidden="true">
          <div class="river">
            <div class="cash-lane op"></div>
            <div class="cash-lane inv"></div>
            <div class="cash-lane fin"></div>
          </div>
          <div class="poster-caption">Three rivers: Operating (teal) · Investing (blue) · Financing (gold)</div>
        </div>
      </section>
      <section class="modes">
        <button class="card" data-go="film" type="button">
          <span class="tag">01 FILM</span>
          <h3>Night at Meridian</h3>
          <p>A 7-scene interactive short. Every wrong classification is a plot twist with a teaching note.</p>
        </button>
        <button class="card" data-go="sort" type="button">
          <span class="tag">02 GAME</span>
          <h3>Three rivers + leftovers</h3>
          <p>26 ICAI-style items: O / I / F, cash equivalent, or not a cash flow. Toggle AS-3 · Ind AS 7 · US GAAP.</p>
        </button>
        <button class="card" data-go="lab" type="button">
          <span class="tag">03 LAB</span>
          <h3>Rebuild the CFS</h3>
          <p>Indirect method from PAT to cash. Click the adjustments and watch the paper write itself.</p>
        </button>
        <button class="card" data-go="quiz" type="button">
          <span class="tag">04 QUIZ</span>
          <h3>Inter + CMA paper</h3>
          <p>Past-paper flavoured stems: FX bank balance, 2-year FD, fire claim, non-cash plant, Companies Act skip.</p>
        </button>
        <button class="card" data-go="drill" type="button">
          <span class="tag">05 DRILL</span>
          <h3>AS-3 flashcards</h3>
          <p>Twelve paras you actually get marks for quoting: cash, equivalents, interest, tax, FX, non-cash.</p>
        </button>
        <button class="card" data-go="library" type="button">
          <span class="tag">06 DESK</span>
          <h3>Official links</h3>
          <p>ICAI AS-3, BoS VCC PDFs, Intermediate course page, Ind AS 7, Companies Act, IMA CMA.</p>
        </button>
      </section>
      <section class="cheat">
        <span class="kicker">Pocket table · non-financial company</span>
        <h2 style="font-size:28px;margin:8px 0 12px">Where ICAI and CMA disagree</h2>
        <table>
          <thead><tr><th>Item</th><th>CA Inter (AS-3)</th><th>Ind AS 7</th><th>US CMA (US GAAP)</th></tr></thead>
          <tbody>
            <tr><td>Interest paid</td><td>Financing</td><td>O or F (be consistent)</td><td>Operating</td></tr>
            <tr><td>Interest / dividends received</td><td>Investing</td><td>O or I (be consistent)</td><td>Operating</td></tr>
            <tr><td>Dividends paid</td><td>Financing</td><td>F (or O if elected)</td><td>Financing</td></tr>
            <tr><td>Demand overdraft</td><td>Financing (Inter RTP)</td><td>Often cash equivalent</td><td>Usually financing</td></tr>
            <tr><td>Extraordinary cash</td><td>Classify + separate heading</td><td>No extraordinary heading</td><td>No extraordinary</td></tr>
            <tr><td>Tax on core profit</td><td>Operating</td><td>Operating</td><td>Operating</td></tr>
          </tbody>
        </table>
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
          state.view = "hub";
        } else {
          state.filmI = c.next;
        }
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
            <button class="btn" data-go="hub" type="button">Lobby</button>
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
        ${picked !== null ? `<p class="explain">${item.explain}</p><div class="actions"><button class="btn primary" id="next-q" type="button">${state.quizI + 1 === CFS.quiz.length ? "See the night’s score" : "Next stem"}</button></div>` : ""}
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
    }
  }

  render();
})();
