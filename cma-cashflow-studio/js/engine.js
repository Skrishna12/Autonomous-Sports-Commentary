window.Engine = {
  norm(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  },

  tokens(s) {
    const stop = new Set(
      "the a an of and or for to in on with from by as is are was be this that which who your you our their it its at into about over under exam part section cma us ima study notes chapter unit".split(" ")
    );
    return this.norm(s)
      .split(" ")
      .filter((w) => w.length > 2 && !stop.has(w));
  },

  score(topic, q) {
    const hay = this.norm(topic.title + " " + topic.keys + " " + (topic.blurb || "") + " " + (topic.part || ""));
    const t = this.tokens(q);
    if (!t.length) return 0;
    let s = 0;
    const nq = this.norm(q);
    if (hay.includes(nq) && nq.length > 4) s += 12;
    t.forEach((w) => {
      if (hay.includes(w)) s += w.length > 5 ? 3 : 2;
      if (this.norm(topic.keys).split(" ").includes(w)) s += 4;
      if (this.norm(topic.title).split(" ").includes(w)) s += 3;
    });
    return s;
  },

  search(q) {
    return TOPICS.map((topic) => ({ topic, s: this.score(topic, q) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s);
  },

  guessPart(q) {
    const n = this.norm(q);
    const hit = (re) => re.test(n);
    const p1 = [];
    const p2 = [];
    if (hit(/cash flow|revenue|asc 606|gaap|ifrs|balance sheet|income statement|oci|lease|inventory|lifo/))
      p1.push("Part 1 · A. External financial reporting decisions (15%)");
    if (hit(/budget|forecast|regression|learning curve|pro forma|rolling|zero based/))
      p1.push("Part 1 · B. Planning, budgeting, and forecasting (20%)");
    if (hit(/variance|standard cost|roi|residual|balanced scorecard|transfer pric|responsibility/))
      p1.push("Part 1 · C. Performance management (20%)");
    if (hit(/abc|absorption|variable cost|job order|overhead|lean|quality cost|joint product/))
      p1.push("Part 1 · D. Cost management (15%)");
    if (hit(/coso|internal control|sox|segregation|itgc|governance/))
      p1.push("Part 1 · E. Internal controls (15%)");
    if (hit(/analytic|erp|data govern|visualization|sdlc|prescriptive|descriptive/))
      p1.push("Part 1 · F. Technology and analytics (15%)");
    if (hit(/ratio|common size|dupont|earnings quality|horizontal|liquidity|leverage/))
      p2.push("Part 2 · A. Financial statement analysis (20%)");
    if (hit(/wacc|capm|working capital|dividend|bond|ipo|beta|currency exposure|merger/))
      p2.push("Part 2 · B. Corporate finance (20%)");
    if (hit(/cvp|break even|make or buy|special order|target cost|sunk|contribution/))
      p2.push("Part 2 · C. Business decision analysis (25%)");
    if (hit(/erm|enterprise risk|hedge|mitigat/)) p2.push("Part 2 · D. Enterprise risk management (10%)");
    if (hit(/npv|irr|payback|capital budget|sensitivity/)) p2.push("Part 2 · E. Capital investment decisions (10%)");
    if (hit(/ethic|ima statement|fraud triangle|confidential|integrity|credibility/))
      p2.push("Part 2 · F. Professional ethics (15%)");
    if (!p1.length && !p2.length) {
      p1.push("Part 1 — check the IMA Content Specification Outline");
      p2.push("Part 2 — check the IMA Content Specification Outline");
    }
    return { p1: [...new Set(p1)], p2: [...new Set(p2)] };
  },

  portals(q) {
    const e = encodeURIComponent(q);
    const cma = encodeURIComponent("US CMA " + q);
    const ima = encodeURIComponent("IMA CMA " + q);
    return [
      {
        tag: "IMA",
        t: "IMA — CMA certification",
        d: "Official US CMA body: exam, handbook, membership.",
        href: "https://www.imanet.org/cma-certification",
      },
      {
        tag: "IMA",
        t: "IMA — CMA exam support",
        d: "Windows, scoring, and candidate FAQs.",
        href: "https://www.google.com/search?q=" + encodeURIComponent("site:imanet.org CMA exam support " + q),
      },
      {
        tag: "CSO",
        t: "2024 Content Specification Outline (PDF)",
        d: "What Part 1 and Part 2 actually test, with weights.",
        href: "https://www.imanet.org/-/media/IMA/Files/Home/IMA-Certifications/CMA-Certification/2024-CMA-Content-Specification-Outlines-Final.ashx",
      },
      {
        tag: "LOS",
        t: "2024 Learning Outcome Statements (PDF)",
        d: "The detailed ‘candidate should be able to’ list.",
        href: "https://www.imanet.org/-/media/IMA/Files/Home/IMA-Certifications/CMA-Certification/2024-CMA-Learning-Outcome-Statement-Final.ashx",
      },
      {
        tag: "Handbook",
        t: "CMA Handbook",
        d: "Windows, MCQ + essay format, GAAP/IFRS policy.",
        href: "https://www.imanet.org/-/media/IMA/Files/Home/IMA-Certifications/CMA-Certification/CMA-Handbook-3132024.ashx",
      },
      {
        tag: "Ethics",
        t: "IMA Statement of Ethical Professional Practice",
        d: "Competence, confidentiality, integrity, credibility.",
        href: "https://www.google.com/search?q=" + encodeURIComponent("IMA Statement of Ethical Professional Practice PDF"),
      },
      {
        tag: "IMA search",
        t: "Search imanet.org",
        d: "Articles, insights, and CMA pages on this topic.",
        href: "https://www.google.com/search?q=site%3Aimanet.org+CMA+" + e,
      },
      {
        tag: "FASB",
        t: "FASB Accounting Standards Codification",
        d: "US GAAP source (ASC 230, 606, 842…).",
        href: "https://www.google.com/search?q=" + encodeURIComponent("FASB ASC " + q),
      },
      {
        tag: "SEC",
        t: "SEC / EDGAR + topic",
        d: "How real filers present the item.",
        href: "https://www.google.com/search?q=" + encodeURIComponent("site:sec.gov " + q),
      },
      {
        tag: "COSO",
        t: "COSO internal control / ERM",
        d: "Framework behind Part 1 controls and Part 2 ERM.",
        href: "https://www.google.com/search?q=" + encodeURIComponent("COSO " + q),
      },
      {
        tag: "IFRS",
        t: "IFRS vs US GAAP on this topic",
        d: "CMA tests major differences.",
        href: "https://www.google.com/search?q=" + encodeURIComponent("IFRS vs US GAAP " + q + " CMA"),
      },
      {
        tag: "Practice",
        t: "Google: US CMA MCQ + topic",
        d: "Practice questions from reputable review providers.",
        href: "https://www.google.com/search?q=" + cma + "+multiple+choice",
      },
      {
        tag: "Video",
        t: "YouTube · US CMA",
        d: "Part 1 / Part 2 lectures on this topic.",
        href: "https://www.youtube.com/results?search_query=" + cma,
      },
      {
        tag: "Video",
        t: "YouTube · IMA wording",
        d: "Search the official name plus the topic.",
        href: "https://www.youtube.com/results?search_query=" + ima,
      },
      {
        tag: "Strategic Finance",
        t: "IMA Strategic Finance magazine",
        d: "Practitioner articles tagged to this topic.",
        href: "https://www.google.com/search?q=" + encodeURIComponent("site:sfmagazine.com " + q),
      },
      {
        tag: "Gleim",
        t: "Gleim CMA review",
        d: "Major CMA review provider search.",
        href: "https://www.google.com/search?q=" + encodeURIComponent("Gleim CMA " + q),
      },
      {
        tag: "Wiley",
        t: "Wiley CMA Excel",
        d: "Wiley / Efficient Learning CMA materials.",
        href: "https://www.google.com/search?q=" + encodeURIComponent("Wiley CMA " + q),
      },
      {
        tag: "Surgent",
        t: "Surgent CMA Review",
        d: "Adaptive CMA review search.",
        href: "https://www.google.com/search?q=" + encodeURIComponent("Surgent CMA " + q),
      },
      {
        tag: "Hock",
        t: "HOCK CMA",
        d: "HOCK International CMA textbooks and questions.",
        href: "https://www.google.com/search?q=" + encodeURIComponent("HOCK CMA " + q),
      },
      {
        tag: "Becker",
        t: "Becker CMA",
        d: "Becker CMA exam review search.",
        href: "https://www.google.com/search?q=" + encodeURIComponent("Becker CMA " + q),
      },
      {
        tag: "Web",
        t: "Investopedia / explainer",
        d: "Plain-English first pass, then return to IMA.",
        href: "https://www.google.com/search?q=" + encodeURIComponent(q + " accounting Investopedia"),
      },
      {
        tag: "Essay",
        t: "CMA essay / constructed response",
        d: "Part 1 and Part 2 essay-style practice on this topic.",
        href: "https://www.google.com/search?q=" + encodeURIComponent("CMA essay question " + q),
      },
      {
        tag: "All",
        t: "Google everything US CMA",
        d: "Wide net: IMA, review courses, articles.",
        href: "https://www.google.com/search?q=" + cma,
      },
    ];
  },

  async wiki(q) {
    const tries = [q, q + " finance", q + " accounting"];
    if (/wacc/i.test(q)) tries.unshift("weighted average cost of capital");
    if (/cash flow/i.test(q)) tries.unshift("statement of cash flows");
    try {
      let titles = [];
      let urls = [];
      for (const search of tries) {
        const sRes = await fetch(
          "https://en.wikipedia.org/w/api.php?action=opensearch&limit=8&namespace=0&origin=*&search=" +
            encodeURIComponent(search)
        );
        const s = await sRes.json();
        titles = s[1] || [];
        urls = s[3] || [];
        if (titles.length) break;
      }
      if (!titles.length) return null;
      const qn = this.norm(q);
      const qtok = this.tokens(q);
      let pick = 0;
      let best = -1;
      titles.forEach((t, i) => {
        const n = this.norm(t);
        let sc = 0;
        if (n.includes(qn) && qn.length > 3) sc += 10;
        qtok.forEach((w) => {
          if (n.includes(w)) sc += 2;
        });
        if (/finance|accounting|cash|capital|cost|budget|ratio|control/.test(n)) sc += 2;
        if (/company|software|album|film|band/.test(n)) sc -= 8;
        if (sc > best) {
          best = sc;
          pick = i;
        }
      });
      const title = titles[pick];
      const sumRes = await fetch(
        "https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title)
      );
      const sum = sumRes.ok ? await sumRes.json() : {};
      const related = titles.slice(0, 5).map((t, i) => ({
        title: t,
        url: urls[i] || "https://en.wikipedia.org/wiki/" + encodeURIComponent(t),
      }));
      return {
        title: sum.title || title,
        extract: sum.extract || "",
        url:
          (sum.content_urls && sum.content_urls.desktop && sum.content_urls.desktop.page) ||
          (related[pick] && related[pick].url),
        related,
      };
    } catch (err) {
      return null;
    }
  },

  linesFromPdfItems(items) {
    const rows = [];
    items.forEach((it) => {
      const str = (it.str || "").replace(/\s+/g, " ");
      if (!str.trim()) return;
      const tr = it.transform || [1, 0, 0, 1, 0, 0];
      const x = tr[4];
      const y = Math.round(tr[5]);
      const last = rows[rows.length - 1];
      if (!last || Math.abs(last.y - y) > 3.5) {
        rows.push({ y, parts: [{ x, str }] });
      } else {
        last.parts.push({ x, str });
      }
    });
    return rows.map((r) =>
      r.parts
        .sort((a, b) => a.x - b.x)
        .map((p) => p.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
    ).filter(Boolean);
  },

  pagesFromPlainText(text) {
    const raw = String(text || "").replace(/\r/g, "");
    let blocks = raw.split(/\f/);
    if (blocks.length === 1) {
      const byMark = raw.split(/\n(?=\s*(?:page|p\.?)\s*\d+\s*$)/im);
      if (byMark.length > 2) blocks = byMark;
    }
    if (blocks.length === 1) {
      const lines = raw.split("\n");
      blocks = [];
      for (let i = 0; i < lines.length; i += 55) {
        blocks.push(lines.slice(i, i + 55).join("\n"));
      }
    }
    return blocks.map((b, i) => {
      const lines = b.split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
      return { n: i + 1, text: lines.join("\n"), lines };
    }).filter((p) => p.text);
  },

  isHeading(line) {
    const t = String(line || "").trim();
    if (t.length < 6 || t.length > 90) return false;
    if (/[.!?]{2}/.test(t)) return false;
    if (/^(the|and|or|but|with|from|this|that|for|are|was|were)\b/i.test(t) && t.length > 40) return false;
    if (/^(chapter|unit|section|part|lesson|topic|module|appendix|exhibit|table|figure|learning outcome)\b/i.test(t))
      return true;
    if (/^\d{1,2}([\.)]|(\s+))[A-Za-z]/.test(t)) return true;
    if (/^[A-Z][A-Z0-9 &/,%\-:]{10,}$/.test(t) && t.split(" ").length <= 12) return true;
    if (t.length < 55 && !/[.!?]$/.test(t) && !/,$/.test(t) && t.split(" ").length <= 8 && /[A-Za-z]/.test(t))
      return true;
    const words = t.split(" ");
    if (words.length >= 2 && words.length <= 10 && !t.endsWith(",") && t.split(".").length === 1) {
      const caps = words.filter((w) => /^[A-Z]/.test(w)).length;
      if (caps >= Math.ceil(words.length * 0.6)) return true;
    }
    return false;
  },

  sentences(text) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
      .map((s) => s.trim())
      .filter((s) => s.length > 35 && s.length < 280);
  },

  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  },

  studyFromPages(pages) {
    const list = pages || [];
    const sections = [];
    let cur = { title: "Start of the notes", page: list[0] ? list[0].n : 1, lines: [] };
    list.forEach((p) => {
      const lines = (p.lines && p.lines.length ? p.lines : String(p.text || "").split("\n")).filter(Boolean);
      lines.forEach((line) => {
        if (this.isHeading(line)) {
          const bodyLen = cur.lines.join(" ").length;
          if (bodyLen > 25) {
            sections.push(cur);
            cur = { title: line.replace(/^\d+[\.)]\s*/, ""), page: p.n, lines: [] };
          } else if (cur.title === "Start of the notes") {
            cur.title = line.replace(/^\d+[\.)]\s*/, "");
            cur.page = p.n;
          } else {
            sections.push(cur);
            cur = { title: line.replace(/^\d+[\.)]\s*/, ""), page: p.n, lines: [] };
          }
        } else {
          cur.lines.push(line);
        }
      });
    });
    if (cur.lines.length || cur.title) sections.push(cur);

    const walkthrough = sections
      .map((s) => {
        const body = s.lines.join(" ").replace(/\s+/g, " ").trim();
        const bits = this.sentences(body);
        return {
          title: s.title,
          page: s.page,
          explain: (bits[0] || body).slice(0, 420),
          body,
        };
      })
      .filter((s) => s.body.length > 25);

    const allSents = [];
    walkthrough.forEach((s) => {
      this.sentences(s.body).forEach((t) => {
        allSents.push({ t, page: s.page, title: s.title });
      });
    });

    const flash = walkthrough.slice(0, 40).map((s) => ({
      f: s.title + (s.page ? " · page " + s.page : ""),
      b: s.explain || s.body.slice(0, 400),
    }));

    const quiz = [];
    const pool = allSents.filter((x) => /[a-z]/i.test(x.t));
    const picks = this.shuffle(pool).slice(0, 24);
    picks.forEach((right) => {
      if (quiz.length >= 10) return;
      const others = this.shuffle(pool.filter((x) => x.t !== right.t)).slice(0, 3);
      if (others.length < 3) return;
      const opts = this.shuffle([right.t, others[0].t, others[1].t, others[2].t]);
      const a = opts.indexOf(right.t);
      quiz.push({
        q: `From Gowtham’s uploaded notes (page ${right.page}${right.title ? ", “" + right.title + "”" : ""}), which line is actually in the file?`,
        opts,
        a,
        explain:
          "That sentence is copied from the uploaded document. The other three lines are also from the file but belong to a different point — go back to that page and read the surrounding paragraph.",
        traps: opts.map((o, i) =>
          i === a
            ? ""
            : "That line is in the notes too, but it is a different point. The question asked for the fact from page " +
              right.page +
              "."
        ),
      });
    });

    const words = this.tokens(list.map((p) => p.text).join(" "));
    return {
      walkthrough,
      flash,
      quiz,
      wordCount: words.length,
      sectionCount: walkthrough.length,
    };
  },

  packFromQuery(q, fileHint) {
    const hits = this.search(q);
    const best = hits[0] && hits[0].s >= 2 ? hits[0].topic : null;
    const parts = this.guessPart(q);
    if (best) {
      if (/^Part 1/.test(best.part)) parts.p1.unshift(best.part);
      else parts.p2.unshift(best.part);
      parts.p1 = [...new Set(parts.p1)];
      parts.p2 = [...new Set(parts.p2)];
    }
    return {
      query: q,
      fileHint: fileHint || "",
      topic: best,
      also: hits.slice(1, 4).map((h) => h.topic),
      papers: parts,
      portals: this.portals(best ? best.title : q),
    };
  },
};
