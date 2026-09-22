window.Engine = {
  norm(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  },

  tokens(s) {
    const stop = new Set("the a an of and or for to in on with from by as is are was be this that which who your you our their it its at into about over under exam paper ca cma us icai ima study notes chapter unit".split(" "));
    return this.norm(s)
      .split(" ")
      .filter((w) => w.length > 2 && !stop.has(w));
  },

  score(topic, q) {
    const hay = this.norm(topic.title + " " + topic.keys + " " + (topic.blurb || ""));
    const t = this.tokens(q);
    if (!t.length) return 0;
    let s = 0;
    const nq = this.norm(q);
    if (hay.includes(nq) && nq.length > 4) s += 12;
    t.forEach((w) => {
      if (hay.includes(w)) s += w.length > 5 ? 3 : 2;
    });
    return s;
  },

  search(q) {
    const scored = TOPICS.map((topic) => ({ topic, s: this.score(topic, q) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s);
    return scored;
  },

  guessPapers(q) {
    const n = this.norm(q);
    const ca = [];
    const cma = [];
    const hit = (re) => re.test(n);
    if (hit(/gst|igst|cgst|supply|hsn|eway/)) ca.push("CA Inter Paper 3B · GST");
    if (hit(/income tax|salary|house property|pgbp|capital gain|80c|tds/)) ca.push("CA Inter Paper 3A · Income-tax");
    if (hit(/audit|sa [0-9]|vouch|assertion|internal control|coso/)) {
      ca.push("CA Inter Paper 5 · Auditing and Ethics");
      cma.push("US CMA Part 1 · Internal controls");
    }
    if (hit(/cost|variance|budget|marginal|process|overhead|labour|material|cvp|standard/)) {
      ca.push("CA Inter Paper 4 · Cost & Management Accounting");
      cma.push("US CMA Part 1 · Cost / performance / budgeting");
    }
    if (hit(/ratio|working capital|npv|irr|wacc|leverage|capital budget|receivable|dividend policy|bond/)) {
      ca.push("CA Inter Paper 6A · Financial Management");
      cma.push("US CMA Part 2 · Corporate finance / FSA / investments");
    }
    if (hit(/strateg|porter|swot|balanced scorecard|bcg|ansoff/)) {
      ca.push("CA Inter Paper 6B · Strategic Management");
      cma.push("US CMA · performance / strategy measures");
    }
    if (hit(/compan(y|ies) act|director|prospectus|share capital|debenture|meeting|nclt/)) ca.push("CA Inter Paper 2 · Corporate and Other Laws");
    if (hit(/as[- ]?\d|ind as|account|revenue|ppe|depreciat|inventor|consolida|amalgam|partnership|cash flow|gaap|ifrs|lease/)) {
      ca.push("CA Inter Paper 1 · Advanced Accounting");
      cma.push("US CMA Part 1 · External financial reporting");
    }
    if (hit(/ethic|independence|confidential/)) {
      ca.push("CA Inter Paper 5 · Ethics");
      cma.push("US CMA · IMA Statement of Ethical Professional Practice");
    }
    if (hit(/analytic|big data|dashboard|predictive/)) cma.push("US CMA Part 1 · Technology and analytics");
    if (!ca.length) ca.push("CA Intermediate — check Paper 1–6 index in BoS study material");
    if (!cma.length) cma.push("US CMA Part 1 or 2 — search the IMA content specification outline");
    return { ca: [...new Set(ca)], cma: [...new Set(cma)] };
  },

  portals(q) {
    const e = encodeURIComponent(q);
    const ca = encodeURIComponent("CA Intermediate " + q);
    const cma = encodeURIComponent("US CMA " + q);
    return [
      { tag: "CA · ICAI", t: "ICAI website search", d: "Official institute pages, announcements, BoS.", href: "https://www.google.com/search?q=site%3Aicai.org+" + e },
      { tag: "CA · BoS", t: "Intermediate course page", d: "Start here for the latest study material edition.", href: "https://www.icai.org/post/intermediate-course" },
      { tag: "CA · SM", t: "Google: ICAI study material + topic", d: "Finds BoS PDFs and RTP/MTP mentions.", href: "https://www.google.com/search?q=" + encodeURIComponent("ICAI study material " + q) },
      { tag: "CA · RTP", t: "Revision Test Papers", d: "site:icai.org RTP + your topic.", href: "https://www.google.com/search?q=" + encodeURIComponent("site:icai.org RTP " + q) },
      { tag: "CA · MTP", t: "Mock Test Papers", d: "site:icai.org MTP + your topic.", href: "https://www.google.com/search?q=" + encodeURIComponent("site:icai.org MTP " + q) },
      { tag: "CA · AS", t: "Accounting standards", d: "AS / Ind AS text on ICAI and MCA.", href: "https://www.google.com/search?q=" + encodeURIComponent("site:icai.org accounting standard " + q) },
      { tag: "CA · video", t: "YouTube · CA Intermediate", d: "Class lectures. Prefer BoS / ICAI first.", href: "https://www.youtube.com/results?search_query=" + ca },
      { tag: "CMA · IMA", t: "IMA / CMA search", d: "Official US CMA body.", href: "https://www.google.com/search?q=site%3Aimanet.org+CMA+" + e },
      { tag: "CMA · outline", t: "CMA content specification", d: "What Part 1 vs Part 2 actually tests.", href: "https://www.google.com/search?q=" + encodeURIComponent("IMA CMA content specification outline " + q) },
      { tag: "CMA · video", t: "YouTube · US CMA", d: "Part 1 / Part 2 lectures on this topic.", href: "https://www.youtube.com/results?search_query=" + cma },
      { tag: "Law", t: "MCA / Companies Act / Ind AS", d: "Ministry of Corporate Affairs.", href: "https://www.google.com/search?q=site%3Amca.gov.in+" + e },
      { tag: "Tax", t: "Income Tax India + GST", d: "Official tax portals plus topic search.", href: "https://www.google.com/search?q=" + encodeURIComponent(q + " site:incometax.gov.in OR site:gst.gov.in") },
      { tag: "Both", t: "Google everything", d: "CA Intermediate and US CMA in one sweep.", href: "https://www.google.com/search?q=" + encodeURIComponent(q + " CA Intermediate OR US CMA") },
    ];
  },

  async wiki(q) {
    try {
      const sRes = await fetch(
        "https://en.wikipedia.org/w/api.php?action=opensearch&limit=1&namespace=0&origin=*&search=" + encodeURIComponent(q)
      );
      const s = await sRes.json();
      const title = s[1] && s[1][0];
      if (!title) return null;
      const sumRes = await fetch("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title));
      if (!sumRes.ok) return null;
      const sum = await sumRes.json();
      return {
        title: sum.title,
        extract: sum.extract,
        url: sum.content_urls && sum.content_urls.desktop && sum.content_urls.desktop.page,
      };
    } catch (err) {
      return null;
    }
  },

  packFromQuery(q, fileHint) {
    const hits = this.search(q);
    const best = hits[0] && hits[0].s >= 3 ? hits[0].topic : null;
    const papers = best ? { ca: [best.ca], cma: [best.cma] } : this.guessPapers(q);
    return {
      query: q,
      fileHint: fileHint || "",
      topic: best,
      also: hits.slice(1, 4).map((h) => h.topic),
      papers,
      portals: this.portals(q),
    };
  },
};
