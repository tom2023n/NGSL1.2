const STORAGE_KEY = "ngsl-progress-v2";
const LIST_PAGE_SIZE = 50;

const state = {
  words: [],
  filtered: [],
  current: null,
  cursor: -1,
  listPage: 1,
  progress: {
    known: {},
    unknown: {},
    favorite: {},
    srs: {}
  },
  training: {
    showAnswer: false
  }
};

const el = {
  totalCount: document.getElementById("totalCount"),
  knownCount: document.getElementById("knownCount"),
  unknownCount: document.getElementById("unknownCount"),
  unfamiliarCount: document.getElementById("unfamiliarCount"),
  focusUnknownBtn: document.getElementById("focusUnknownBtn"),
  favoriteCount: document.getElementById("favoriteCount"),
  progressLabel: document.getElementById("progressLabel"),
  progressFill: document.getElementById("progressFill"),
  resetProgressBtn: document.getElementById("resetProgressBtn"),
  modeSelect: document.getElementById("modeSelect"),
  nextBtn: document.getElementById("nextBtn"),
  speakBtn: document.getElementById("speakBtn"),
  rankText: document.getElementById("rankText"),
  wordText: document.getElementById("wordText"),
  pronText: document.getElementById("pronText"),
  posText: document.getElementById("posText"),
  meaningText: document.getElementById("meaningText"),
  exampleText: document.getElementById("exampleText"),
  exampleSpeakBtn: document.getElementById("exampleSpeakBtn"),
  exampleCnText: document.getElementById("exampleCnText"),
  knownBtn: document.getElementById("knownBtn"),
  unknownBtn: document.getElementById("unknownBtn"),
  favoriteBtn: document.getElementById("favoriteBtn"),
  trainPrompt: document.getElementById("trainPrompt"),
  trainInput: document.getElementById("trainInput"),
  submitTrainBtn: document.getElementById("submitTrainBtn"),
  trainFeedback: document.getElementById("trainFeedback"),
  trainAnswer: document.getElementById("trainAnswer"),
  searchInput: document.getElementById("searchInput"),
  listView: document.getElementById("listView"),
  prevPageBtn: document.getElementById("prevPageBtn"),
  nextPageBtn: document.getElementById("nextPageBtn"),
  pageInfo: document.getElementById("pageInfo")
};

function normalizeProgress(parsed) {
  const defaults = {
    known: {},
    unknown: {},
    favorite: {},
    srs: {},
    resume: {
      mode: "all",
      word: ""
    }
  };
  const safe = { ...defaults, ...(parsed || {}) };
  safe.resume = { ...defaults.resume, ...(safe.resume || {}) };
  return safe;
}

function createEmptyProgress() {
  return normalizeProgress(null);
}

function loadProgress() {
  try {
    const rawV2 = localStorage.getItem(STORAGE_KEY);
    if (rawV2) {
      state.progress = normalizeProgress(JSON.parse(rawV2));
      return;
    }

    const rawV1 = localStorage.getItem("ngsl-progress-v1");
    if (rawV1) {
      state.progress = normalizeProgress(JSON.parse(rawV1));
      saveProgress();
      return;
    }

    state.progress = normalizeProgress(null);
  } catch (_) {
    state.progress = normalizeProgress(null);
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
}

function persistResume(word) {
  state.progress.resume = {
    mode: el.modeSelect.value || "all",
    word: word || ""
  };
  saveProgress();
}

function getMeaning(item) {
  const en = (item.en || "").trim();
  const cn = (item.cn || "").trim();
  if (cn && !cn.includes("?")) return `${cn} / ${en}`;
  return en || item.gloss || "暂无释义";
}

function getCnPrompt(item) {
  const cn = (item.cn || "").trim();
  if (cn && !cn.includes("?")) return cn;
  const gloss = (item.gloss || "").trim();
  if (gloss) return gloss;
  return "暂无中文释义";
}

function buildExample(item) {
  const word = (item.word || "").trim();
  const pos = (item.pos || "").toLowerCase();
  const cn = (item.cn || "").trim();
  const cap = word ? word.charAt(0).toUpperCase() + word.slice(1) : "";

  if (pos.includes("verb")) {
    return { en: `I usually ${word} after dinner because it helps me relax.`, cn: "我通常晚饭后会这样做，因为这能让我放松。" };
  }
  if (pos.includes("noun")) {
    return { en: `This ${word} is important because we need it for our project at school.`, cn: "这个很重要，因为我们在学校项目中需要它。" };
  }
  if (pos.includes("adj")) {
    return { en: `The lesson was ${word}, so everyone could follow the teacher easily.`, cn: "这节课是这种状态，所以大家都能轻松跟上老师。" };
  }
  if (pos.includes("adv")) {
    return { en: `She explained the idea ${word}, and I finally understood the main point.`, cn: "她以这种方式解释了这个观点，我终于理解了重点。" };
  }
  if (pos.includes("prep")) {
    return { en: `I left my notebook ${word} the laptop, so I could find it quickly later.`, cn: "我把笔记本放在笔记本电脑的那个位置关系处，这样之后能很快找到。" };
  }
  if (pos.includes("conj")) {
    return { en: `I was tired, ${word} I still finished the task before the deadline.`, cn: "我很累，但我还是在截止前完成了任务。" };
  }
  if (pos.includes("det")) {
    return { en: `I saw ${word} student waiting outside, and she looked a little nervous.`, cn: "我看见一个学生在外面等着，而且她看起来有点紧张。" };
  }
  if (pos.includes("pron")) {
    return { en: `${cap} told me the answer, so I could complete the exercise on time.`, cn: "这个代词指代的人告诉了我答案，所以我能按时完成练习。" };
  }
  if (pos.includes("num")) {
    return { en: `I bought ${word} tickets online, and we entered the museum together.`, cn: "我在网上买了这个数量的票，我们一起进入了博物馆。" };
  }

  return {
    en: `I learned the word "${word}" today, and I will try to use it in conversation.`,
    cn: cn ? `这个词常表示：${cn}，我会尝试在对话里使用它。` : "这是一个常用英语词，我会尝试在对话里使用它。"
  };
}

function getDueWords() {
  const now = Date.now();
  return state.words.filter((w) => {
    const s = state.progress.srs[w.word];
    return s && s.dueAt && s.dueAt <= now;
  });
}

function refreshStats() {
  const dueCount = getDueWords().length;
  const knownCount = Object.keys(state.progress.known).length;
  const unfamiliarCount = Object.keys(state.progress.unknown).length;
  const totalCount = state.words.length;
  const progressPercent = totalCount > 0 ? Math.round((knownCount / totalCount) * 100) : 0;

  el.totalCount.textContent = state.words.length;
  el.knownCount.textContent = knownCount;
  el.unknownCount.textContent = dueCount;
  el.unfamiliarCount.textContent = unfamiliarCount;
  el.favoriteCount.textContent = Object.keys(state.progress.favorite).length;
  el.progressLabel.textContent = `学习进度 ${progressPercent}%（${knownCount}/${totalCount}）`;
  el.progressFill.style.width = `${progressPercent}%`;
}

function applyFilter() {
  const mode = el.modeSelect.value;
  if (mode === "unknown") {
    state.filtered = state.words.filter((w) => state.progress.unknown[w.word]);
    return;
  }
  if (mode === "favorite") {
    state.filtered = state.words.filter((w) => state.progress.favorite[w.word]);
    return;
  }
  if (mode === "due") {
    state.filtered = getDueWords();
    return;
  }
  state.filtered = state.words;
}

function renderTraining(item) {
  if (!item) {
    el.trainPrompt.textContent = "中文释义：当前范围没有单词";
    el.trainInput.value = "";
    el.trainInput.disabled = true;
    el.submitTrainBtn.disabled = true;
    el.trainAnswer.textContent = "";
    return;
  }

  el.trainPrompt.textContent = `中文释义：${getCnPrompt(item)}`;
  el.trainInput.disabled = false;
  el.submitTrainBtn.disabled = false;
  el.trainInput.value = "";
  el.trainAnswer.textContent = state.training.showAnswer ? `答案：${item.word}` : "";
  el.trainInput.focus();
}

function renderCard(item) {
  if (!item) {
    el.rankText.textContent = "#-";
    el.wordText.textContent = "当前范围没有单词";
    el.pronText.textContent = "";
    el.posText.textContent = "";
    el.meaningText.textContent = "请切换学习范围，或先给单词打标签。";
    el.exampleText.textContent = "";
    el.exampleCnText.textContent = "";
    el.favoriteBtn.textContent = "收藏";
    renderTraining(item);
    persistResume("");
    return;
  }

  el.rankText.textContent = `#${item.rank}`;
  el.wordText.textContent = item.word;
  el.pronText.textContent = item.pronunciation || "";
  el.posText.textContent = item.pos || "";
  el.meaningText.textContent = getMeaning(item);
  const ex = buildExample(item);
  el.exampleText.textContent = `Example: ${ex.en}`;
  el.exampleCnText.textContent = `例句理解：${ex.cn}`;
  el.favoriteBtn.textContent = state.progress.favorite[item.word] ? "取消收藏" : "收藏";

  state.training.showAnswer = false;
  renderTraining(item);
  persistResume(item.word);
}

function nextWord() {
  applyFilter();
  if (!state.filtered.length) {
    state.current = null;
    state.cursor = -1;
    renderCard(state.current);
    return;
  }

  if (state.cursor < 0 || state.cursor >= state.filtered.length - 1) {
    state.cursor = 0;
  } else {
    state.cursor += 1;
  }
  state.current = state.filtered[state.cursor];
  renderCard(state.current);
}

function updateSrs(word, remembered) {
  const now = Date.now();
  const old = state.progress.srs[word] || { intervalDays: 1, ease: 2.3, streak: 0, dueAt: now };

  let intervalDays = old.intervalDays;
  let ease = old.ease;
  let streak = old.streak;

  if (remembered) {
    streak += 1;
    ease = Math.min(2.8, ease + 0.1);
    intervalDays = Math.max(1, Math.round(intervalDays * ease));
  } else {
    streak = 0;
    ease = Math.max(1.3, ease - 0.2);
    intervalDays = 1;
  }

  state.progress.srs[word] = {
    intervalDays,
    ease,
    streak,
    dueAt: now + intervalDays * 24 * 60 * 60 * 1000
  };
}

function tagCurrent(type) {
  const item = state.current;
  if (!item) return;

  if (type === "known") {
    state.progress.known[item.word] = 1;
    delete state.progress.unknown[item.word];
    updateSrs(item.word, true);
  }
  if (type === "unknown") {
    state.progress.unknown[item.word] = 1;
    delete state.progress.known[item.word];
    updateSrs(item.word, false);
  }

  saveProgress();
  refreshStats();
  renderList();
  nextWord();
}

function toggleFavorite() {
  const item = state.current;
  if (!item) return;

  if (state.progress.favorite[item.word]) {
    delete state.progress.favorite[item.word];
  } else {
    state.progress.favorite[item.word] = 1;
  }

  saveProgress();
  refreshStats();
  renderList();
  renderCard(item);
}

function speakCurrentWord() {
  if (!state.current || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(state.current.word);
  utter.lang = "en-US";
  utter.rate = 0.9;
  utter.pitch = 1;
  window.speechSynthesis.speak(utter);
}

function speakCurrentExample() {
  if (!state.current || !window.speechSynthesis) return;
  const example = buildExample(state.current).en;
  if (!example) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(example);
  utter.lang = "en-US";
  utter.rate = 0.9;
  utter.pitch = 1;
  window.speechSynthesis.speak(utter);
}

function showAnswer() {
  if (!state.current) return;
  state.training.showAnswer = true;
  el.trainAnswer.textContent = `答案：${state.current.word}`;
}

function submitTrainingAndNext() {
  if (!state.current) return;
  const user = el.trainInput.value.trim().toLowerCase();
  const answer = state.current.word.trim().toLowerCase();

  if (!user) {
    el.trainFeedback.textContent = "请输入英文单词后再提交。";
    return;
  }

  if (user === answer) {
    el.trainFeedback.textContent = `正确：${state.current.word}`;
  } else {
    el.trainFeedback.textContent = `错误：你输入 ${el.trainInput.value.trim()}，正确答案是 ${state.current.word}`;
  }

  saveProgress();
  refreshStats();
  nextWord();
}

function renderList() {
  const q = el.searchInput.value.trim().toLowerCase();
  const matched = state.words.filter((w) => w.word.toLowerCase().includes(q));
  const totalPages = Math.max(1, Math.ceil(matched.length / LIST_PAGE_SIZE));
  if (state.listPage > totalPages) state.listPage = totalPages;
  if (state.listPage < 1) state.listPage = 1;

  const start = (state.listPage - 1) * LIST_PAGE_SIZE;
  const end = start + LIST_PAGE_SIZE;
  const show = matched.slice(start, end);

  el.listView.innerHTML = "";
  for (const item of show) {
    const li = document.createElement("li");
    const tags = [];
    if (state.progress.known[item.word]) tags.push("已掌握");
    if (state.progress.unknown[item.word]) tags.push("待复习");
    if (state.progress.favorite[item.word]) tags.push("收藏");
    const srs = state.progress.srs[item.word];
    if (srs && srs.dueAt <= Date.now()) tags.push("到期复习");
    const suffix = tags.length ? ` [${tags.join("/")}]` : "";
    const ex = buildExample(item);

    const head = document.createElement("div");
    head.className = "list-head";
    head.textContent = `${item.rank}. ${item.word} (${item.pos || "-"}) - ${getMeaning(item)}${suffix}`;

    const exampleLine = document.createElement("div");
    exampleLine.className = "list-example";
    exampleLine.textContent = `Example: ${ex.en}`;

    li.appendChild(head);
    li.appendChild(exampleLine);
    el.listView.appendChild(li);
  }

  el.pageInfo.textContent = `第 ${state.listPage} / ${totalPages} 页`;
  el.prevPageBtn.disabled = state.listPage <= 1;
  el.nextPageBtn.disabled = state.listPage >= totalPages;
}

function handleKeyboard(e) {
  const active = document.activeElement;

  if (e.ctrlKey && (e.key === "'" || e.code === "Quote")) {
    e.preventDefault();
    speakCurrentWord();
    return;
  }
  if (e.ctrlKey && (e.key === "m" || e.key === "M")) {
    e.preventDefault();
    tagCurrent("known");
    return;
  }
  if (e.ctrlKey && (e.key === "n" || e.key === "N")) {
    e.preventDefault();
    tagCurrent("unknown");
    return;
  }
  if (e.ctrlKey && (e.key === ";" || e.code === "Semicolon")) {
    e.preventDefault();
    showAnswer();
    return;
  }

  if (e.ctrlKey || e.altKey || e.metaKey) return;

  const isSubmitKey = e.key === "Enter" || e.code === "Space" || e.key === " ";
  if (!isSubmitKey) return;

  const allow = active === el.trainInput || active === document.body;
  if (!allow) return;

  e.preventDefault();
  submitTrainingAndNext();
}

function bindEvents() {
  el.modeSelect.addEventListener("change", () => {
    state.cursor = -1;
    nextWord();
  });
  el.nextBtn.addEventListener("click", () => nextWord());
  el.speakBtn.addEventListener("click", speakCurrentWord);
  el.knownBtn.addEventListener("click", () => tagCurrent("known"));
  el.unknownBtn.addEventListener("click", () => tagCurrent("unknown"));
  el.favoriteBtn.addEventListener("click", toggleFavorite);
  el.exampleSpeakBtn.addEventListener("click", speakCurrentExample);
  el.focusUnknownBtn.addEventListener("click", () => {
    el.modeSelect.value = "unknown";
    state.cursor = -1;
    nextWord();
  });
  el.resetProgressBtn.addEventListener("click", () => {
    const ok = window.confirm("确认清除所有学习进度吗？此操作无法撤销。");
    if (!ok) return;
    state.progress = createEmptyProgress();
    state.cursor = -1;
    state.listPage = 1;
    el.modeSelect.value = "all";
    saveProgress();
    refreshStats();
    renderList();
    nextWord();
  });
  el.submitTrainBtn.addEventListener("click", submitTrainingAndNext);

  el.searchInput.addEventListener("input", () => {
    state.listPage = 1;
    renderList();
  });
  el.prevPageBtn.addEventListener("click", () => {
    state.listPage -= 1;
    renderList();
  });
  el.nextPageBtn.addEventListener("click", () => {
    state.listPage += 1;
    renderList();
  });

  document.addEventListener("keydown", handleKeyboard);
}

function restoreResumeOrStart() {
  const resume = state.progress.resume || {};
  const allowedModes = new Set(["all", "unknown", "favorite", "due"]);
  const mode = allowedModes.has(resume.mode) ? resume.mode : "all";
  el.modeSelect.value = mode;

  applyFilter();
  if (resume.word) {
    const idx = state.filtered.findIndex((w) => w.word === resume.word);
    if (idx >= 0) {
      state.cursor = idx;
      state.current = state.filtered[idx];
      renderCard(state.current);
      return;
    }
  }

  state.cursor = -1;
  nextWord();
}

async function init() {
  loadProgress();
  bindEvents();

  const resp = await fetch("./data/words.json");
  if (!resp.ok) {
    el.wordText.textContent = "词库加载失败";
    return;
  }

  state.words = await resp.json();
  state.words.sort((a, b) => a.rank - b.rank);

  refreshStats();
  restoreResumeOrStart();
  renderList();
}

init();
