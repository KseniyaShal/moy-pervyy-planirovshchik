(() => {
  "use strict";

  const STORAGE_KEY = "plannerMotivator.data";
  const PROBE_KEY = "plannerMotivator.storageProbe";
  const MIN_DATE = "1900-01-01";
  const MAX_DATE = "2099-12-31";
  const DAY_LIMIT = 15;
  const DAY_NAMES = ["понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье"];
  const MONTH_NAMES = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  const MESSAGES = {
    unavailable: "браузер не разрешает сохранять данные. Изменения сейчас недоступны. Проверь настройки браузера и попробуй снова",
    corrupt: "сохранённые данные не удалось прочитать. Они не изменены",
    unsupported: "эти данные созданы другой версией приложения. Они не изменены",
    write: "не удалось сохранить изменения. Они не применены. Проверь доступное место и настройки браузера, затем попробуй снова",
    capacity: "в этом дне уже 15 тренировок. Выбери другую дату или удали лишнюю запись"
  };
  const RESULT_PHRASES = {
    skipped: ["одна пропущенная тренировка не обнуляет твои усилия. Продолжить можно в другой день 🌿", "сегодня не сложилось. План можно поправить, а себя поддержать 🤍", "календарь выдержит перенос. Он вообще довольно спокойный 🙂"],
    over: ["ты уделила движению больше времени, чем планировала. Хорошая работа! ✨", "план получил бонусные минуты. Ты молодец 🌿", "сегодня получилось больше задуманного. Пусть отдых тоже найдётся в расписании 🙂"],
    equal: ["тренировка по плану выполнена. Хорошая работа! 🙌", "план и факт встретились. Красивое совпадение ✨", "ты сделала то, что запланировала. Можно поставить довольную галочку ✅"],
    under: ["ты нашла время для движения. Даже короткое занятие считается 🌿", "пусть минут меньше, зато занятие состоялось. Это уже результат 🤍", "сегодня получилась компактная версия тренировки. Она тоже идёт в зачёт 🙂"]
  };
  const WEEK_PHRASES = {
    empty: ["выбери удобный день и запланируй первую тренировку 🌿", "календарь пока свободен. Добавим немного движения? 🙂"],
    future: ["план готовится. Оставь в нём место и для отдыха 🌿", "будущая неделя уже получила немного движения. Хорошее начало ✨"],
    pending: ["не всё ещё отмечено. Запиши результат, когда будет удобно 🤍", "план живой, а не высечен в камне. Продолжай в своём темпе 🌿"],
    allSkipped: ["на этой неделе не получилось позаниматься. Можно начать снова с одного удобного дня 🤍", "неделя сложилась иначе. Поддержи себя и поправь следующий план 🌿"],
    mixed: ["были пропуски, но были и занятия. Твои усилия никуда не исчезли 🌿", "не всё пошло по плану, но движение было. Календарь не требует идеальности 🙂"],
    over: ["ты уделила тренировкам больше времени, чем планировала. Отличная работа! ✨", "на этой неделе у плана появились бонусные минуты. Ты молодец 🙌"],
    equal: ["все занятия отмечены, время по плану. Хорошая работа! ✅", "план и факт подружились. Можно порадоваться результату ✨"],
    under: ["ты отметила все занятия и нашла время для движения. Это ценно 🌿", "занятия состоялись, даже если были короче. План можно подстроить под жизнь 🙂"]
  };
  // Сначала частные случаи, затем общие виды активности.
  const ACTIVITY_SYMBOLS = [
    [/собак|щен|(?:^|[^\p{L}])пес(?:[^\p{L}]|$)|dog\b/u, "🐕⚽"],
    [/настольн.{0,20}теннис|пинг.?понг|table.?tennis/u, "🏓"],
    [/теннис|tennis/u, "🎾"],
    [/бадминтон|badminton/u, "🏸"],
    [/(?:^|[^\p{L}])(?:бег|беж|пробеж|джогг|run|jog)/u, "🏃‍♀️"],
    [/прогул|ходьб|скандинав|walking|walk\b/u, "🚶‍♀️"],
    [/велос|велопр|велоезд|велотр|cycling|bicycle|bike/u, "🚴‍♀️"],
    [/йог|yoga/u, "🧘‍♀️"],
    [/плаван|плыв|бассейн|swim/u, "🏊‍♀️"],
    [/растяж|стретч|пилатес|stretch|pilates/u, "🤸‍♀️"],
    [/танц|танец|зумба|danc|zumba/u, "💃"],
    [/футбол|soccer|football/u, "⚽"],
    [/баскетбол|basketball/u, "🏀"],
    [/волейбол|volleyball/u, "🏐"],
    [/бокс|boxing/u, "🥊"],
    [/лыж|ski(?:ing)?\b/u, "⛷️"],
    [/коньк|skating/u, "⛸️"],
    [/поход|трекинг|хайкинг|hiking/u, "🥾"],
    [/фитнес|силов|тренажер|гантел|штанг|gym|fitness/u, "🏋️‍♀️"],
    [/зарядк|разминк/u, "🤸‍♀️"]
  ];
  const $ = (id) => document.getElementById(id);
  const dialog = $("training-dialog");
  const form = $("training-form");
  const resultForm = $("result-form");
  const transferForm = $("transfer-form");
  const inputs = { title: $("activity"), date: $("training-date"), hours: $("planned-hours"), minutes: $("planned-minutes") };
  const errors = { title: $("activity-error"), date: $("date-error"), hours: $("hours-error"), minutes: $("minutes-error") };
  const resultInputs = { hours: $("actual-hours"), minutes: $("actual-minutes") };
  const resultErrors = { hours: $("actual-hours-error"), minutes: $("actual-minutes-error") };
  let data = { version: 1, workouts: [] };
  let loaded = false;
  let storageState = "ready";
  let probeNeeded = true;
  let selectedWeek = weekStart(today());
  let editingId = null;
  let deletingId = null;
  let resultId = null;
  let transferId = null;
  let recoveryMode = false;
  let pendingRefresh = false;
  let confirmationAction = "delete";
  let confirmationResume = false;
  let returnTarget = null;
  let returnDate = null;
  let busy = false;
  let pointerStartedOutside = false;
  let notificationTimer;
  let lastToday = today();

  function dateString(date) {
    return `${date.getFullYear().toString().padStart(4, "0")}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
  }
  function today() { return dateString(new Date()); }
  function parseDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split("-").map(Number);
    const result = new Date(0);
    result.setHours(12, 0, 0, 0);
    result.setFullYear(year, month - 1, day);
    return dateString(result) === value ? result : null;
  }
  function allowedDate(value) { return Boolean(parseDate(value)) && value >= MIN_DATE && value <= MAX_DATE; }
  function shiftDate(value, days) {
    const result = parseDate(value);
    result.setDate(result.getDate() + days);
    return dateString(result);
  }
  function weekStart(value) {
    const date = parseDate(value);
    return shiftDate(value, -((date.getDay() + 6) % 7));
  }
  function weekDates(start) { return Array.from({ length: 7 }, (_, index) => shiftDate(start, index)); }
  function validWeek(start) { return weekDates(start).some(allowedDate); }
  function formatDate(value, withYear = false) {
    const date = parseDate(value);
    return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]}${withYear ? ` ${date.getFullYear()}` : ""}`;
  }
  function formatWeekday(value) {
    const date = parseDate(value);
    return date ? sentenceCase(DAY_NAMES[(date.getDay() + 6) % 7]) : "";
  }
  function formatWeek(start) {
    const a = parseDate(start);
    const end = shiftDate(start, 6);
    const b = parseDate(end);
    if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) return `${a.getDate()}-${b.getDate()} ${MONTH_NAMES[a.getMonth()]} ${a.getFullYear()}`;
    if (a.getFullYear() === b.getFullYear()) return `${formatDate(start)} - ${formatDate(end, true)}`;
    return `${formatDate(start, true)} - ${formatDate(end, true)}`;
  }
  function plural(value, forms) {
    const lastTwo = value % 100;
    if (lastTwo >= 11 && lastTwo <= 14) return forms[2];
    const last = value % 10;
    return last === 1 ? forms[0] : last >= 2 && last <= 4 ? forms[1] : forms[2];
  }
  function duration(value) {
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    const parts = [];
    if (hours) parts.push(`${hours} ${plural(hours, ["час", "часа", "часов"])}`);
    if (minutes || !hours) parts.push(`${minutes} ${plural(minutes, ["минута", "минуты", "минут"])}`);
    return parts.join(" ");
  }
  function normalizeTitle(value) { return value.trim().replace(/\s+/gu, " "); }
  function sentenceCase(value) {
    const characters = [...value];
    return characters.length ? characters[0].toLocaleUpperCase("ru-RU") + characters.slice(1).join("") : value;
  }
  function displayTitle(value) { return value.replace(/\p{L}/u, (letter) => letter.toLocaleUpperCase("ru-RU")); }
  function trainingCount(value, excludeId = null) { return data.workouts.filter((item) => item.date === value && item.id !== excludeId).length; }
  function calculateWeek(start) {
    const end = shiftDate(start, 6);
    const records = data.workouts.filter((item) => item.date >= start && item.date <= end);
    const plannedMinutes = records.reduce((sum, item) => sum + item.plannedMinutes, 0);
    const actualMinutes = records.reduce((sum, item) => sum + (item.status === "completed" ? item.actualMinutes : 0), 0);
    return {
      plannedCount: records.length,
      plannedMinutes,
      completedCount: records.filter((item) => item.status === "completed").length,
      actualMinutes,
      skippedCount: records.filter((item) => item.status === "skipped").length,
      pendingCount: records.filter((item) => item.status === "planned").length,
      differenceMinutes: actualMinutes - plannedMinutes
    };
  }
  function choosePhrase(seed, phrases) {
    let sum = 0;
    for (let index = 0; index < seed.length; index++) sum += seed.charCodeAt(index);
    return sentenceCase(phrases[sum % phrases.length]);
  }
  function resultCategory(item) {
    if (item.status === "skipped") return "skipped";
    if (item.status !== "completed") return null;
    return item.actualMinutes > item.plannedMinutes ? "over" : item.actualMinutes === item.plannedMinutes ? "equal" : "under";
  }
  function resultMessage(item) {
    const category = resultCategory(item);
    return category ? choosePhrase(item.id, RESULT_PHRASES[category]) : "";
  }
  function weekCategory(summary, start, currentDate = today()) {
    if (!summary.plannedCount) return "empty";
    if (start > weekStart(currentDate)) return "future";
    if (summary.pendingCount) return "pending";
    if (summary.skippedCount) return summary.completedCount ? "mixed" : "allSkipped";
    return summary.actualMinutes > summary.plannedMinutes ? "over" : summary.actualMinutes === summary.plannedMinutes ? "equal" : "under";
  }
  function weekNote(summary, start, currentDate = today()) {
    if (!summary.plannedCount) return "";
    const currentWeek = weekStart(currentDate);
    if (start > currentWeek) return "Это план будущей недели. Результаты можно будет отметить начиная с дат занятий";
    if (start === currentWeek) return `Промежуточный итог${summary.pendingCount ? `. Ещё без отметки - ${summary.pendingCount}` : ""}`;
    return summary.pendingCount ? "Есть тренировки без отметки, итог пока неполный" : "Все тренировки недели отмечены";
  }
  function validateData(value) {
    if (!value || typeof value !== "object" || value.version !== 1 || !Array.isArray(value.workouts)) throw new Error("corrupt");
    const identifiers = new Set();
    for (const item of value.workouts) {
      if (!item || typeof item !== "object" || typeof item.id !== "string" || !item.id.trim() || identifiers.has(item.id)) throw new Error("corrupt");
      identifiers.add(item.id);
      if (typeof item.title !== "string" || normalizeTitle(item.title) !== item.title || [...item.title].length < 1 || [...item.title].length > 80) throw new Error("corrupt");
      if (!allowedDate(item.date) || !Number.isInteger(item.plannedMinutes) || item.plannedMinutes < 1 || item.plannedMinutes > 1440) throw new Error("corrupt");
      if (!Number.isSafeInteger(item.createdAt) || item.createdAt < 0 || !Number.isSafeInteger(item.updatedAt) || item.updatedAt < 0) throw new Error("corrupt");
      const validState = (item.status === "planned" && item.actualMinutes === null) ||
        (item.status === "skipped" && item.actualMinutes === 0) ||
        (item.status === "completed" && Number.isInteger(item.actualMinutes) && item.actualMinutes >= 1 && item.actualMinutes <= 1440);
      if (!validState) throw new Error("corrupt");
    }
    return value;
  }
  function showStorageMessage(kind) {
    $("storage-message").textContent = sentenceCase(MESSAGES[kind]);
    $("storage-warning").hidden = false;
    $("dialog-storage-retry").hidden = false;
  }
  function hideStorageMessage() {
    $("storage-warning").hidden = true;
    $("dialog-storage-retry").hidden = true;
  }
  function loadData() {
    let raw;
    try { raw = window.localStorage.getItem(STORAGE_KEY); }
    catch { storageState = "unavailable"; showStorageMessage(storageState); return false; }
    let candidate;
    try {
      candidate = raw === null ? { version: 1, workouts: [] } : JSON.parse(raw);
      if (candidate && typeof candidate.version === "number" && candidate.version !== 1) {
        storageState = "unsupported"; showStorageMessage(storageState); return false;
      }
      validateData(candidate);
    } catch { storageState = "corrupt"; showStorageMessage(storageState); return false; }
    data = candidate;
    loaded = true;
    storageState = "ready";
    hideStorageMessage();
    return true;
  }
  function probeStorage() {
    const value = `probe-${Date.now()}`;
    const storage = window.localStorage;
    try {
      storage.setItem(PROBE_KEY, value);
      if (storage.getItem(PROBE_KEY) !== value) throw new Error("unavailable");
    } finally { storage.removeItem(PROBE_KEY); }
    probeNeeded = false;
  }
  function canRecover() { return storageState === "corrupt" || storageState === "unsupported"; }
  function refreshDateBounds() {
    const currentDate = today();
    const editing = data.workouts.find((item) => item.id === editingId);
    inputs.date.min = MIN_DATE;
    inputs.date.max = editing && editing.status !== "planned" && currentDate < MAX_DATE ? currentDate : MAX_DATE;
    $("transfer-date").min = currentDate > MIN_DATE ? currentDate : MIN_DATE;
    $("transfer-date").max = MAX_DATE;
    const editUnavailable = inputs.date.max < MIN_DATE;
    const transferUnavailable = $("transfer-date").min > MAX_DATE;
    if (dialog.open && ((!form.hidden && editUnavailable) || (!transferForm.hidden && transferUnavailable))) {
      const error = form.hidden ? $("transfer-date-error") : errors.date;
      error.textContent = "Дата вне доступного диапазона";
      error.hidden = false;
    }
    return { editUnavailable, transferUnavailable };
  }
  function updateWriteAvailability() {
    const unavailable = busy || pendingRefresh || storageState !== "ready";
    const bounds = refreshDateBounds();
    $("save-training").disabled = unavailable || bounds.editUnavailable;
    $("save-transfer").disabled = unavailable || bounds.transferUnavailable;
    $("confirm-delete").disabled = unavailable;
    $("confirm-clear").disabled = busy || pendingRefresh || !$("clear-understood").checked ||
      (storageState !== "ready" && !(recoveryMode && canRecover()));
    $("retry-storage-dialog").disabled = busy || pendingRefresh;
    updateResultAvailability();
  }
  function commit(candidate, errorElement, recovery = false) {
    if (pendingRefresh) return false;
    if (busy || (storageState !== "ready" && !(recovery && canRecover()))) {
      errorElement.textContent = sentenceCase(MESSAGES[storageState] || MESSAGES.write);
      errorElement.hidden = false;
      return false;
    }
    busy = true;
    updateWriteAvailability();
    try {
      if (probeNeeded) {
        try { probeStorage(); }
        catch { storageState = "unavailable"; showStorageMessage(storageState); render(); throw new Error("unavailable"); }
      }
      validateData(candidate);
      const serialized = JSON.stringify(candidate);
      window.localStorage.setItem(STORAGE_KEY, serialized);
      data = candidate;
      loaded = true;
      storageState = "ready";
      errorElement.hidden = true;
      hideStorageMessage();
      render();
      return true;
    } catch {
      const kind = storageState === "unavailable" ? "unavailable" : "write";
      showStorageMessage(kind);
      errorElement.textContent = sentenceCase(MESSAGES[kind]);
      errorElement.hidden = false;
      return false;
    } finally {
      busy = false;
      updateWriteAvailability();
    }
  }
  function element(tag, className, text) {
    const result = document.createElement(tag);
    if (className) result.className = className;
    if (text !== undefined) result.textContent = sentenceCase(text);
    return result;
  }
  function button(text, action, fields = {}) {
    const result = element("button", "", text);
    result.type = "button";
    result.dataset.action = action;
    Object.entries(fields).forEach(([key, value]) => { result.dataset[key] = value; });
    return result;
  }
  function activitySymbol(title) {
    const normalized = title.toLocaleLowerCase("ru-RU").replaceAll("ё", "е");
    return ACTIVITY_SYMBOLS.find(([pattern]) => pattern.test(normalized))?.[1] || "💪";
  }
  function addCheckmark(control) {
    const label = element("span", "", control.textContent);
    const check = element("span", "checkmark", "✓");
    check.setAttribute("aria-hidden", "true");
    control.replaceChildren(check, label);
    control.classList.add("with-checkmark");
  }
  function renderCard(item) {
    const card = element("article", "training-card");
    card.dataset.id = item.id;
    const heading = element("h4", "training-title", displayTitle(item.title));
    const details = element("div", "training-details");
    details.append(element("p", "", `план - ${duration(item.plannedMinutes)}`));
    details.append(element("p", "", `факт - ${item.actualMinutes === null ? "ещё не отмечено" : duration(item.actualMinutes)}`));
    const labels = { planned: "запланировано", completed: "выполнено", skipped: "пропущено" };
    const status = element("p", `training-status status-${item.status}`, labels[item.status]);
    if (item.status === "completed") addCheckmark(status);
    const actions = element("div", "training-actions");
    if (item.date <= today()) {
      const result = button(item.status === "completed" ? "изменить результат" : "отметить результат", "result", { id: item.id });
      result.className = item.status === "planned" ? "button-primary" : "";
      result.setAttribute("aria-label", `${result.textContent} «${displayTitle(item.title)}»`);
      if (item.status !== "completed") addCheckmark(result);
      result.disabled = storageState !== "ready";
      actions.append(result);
      if (item.status === "planned") {
        const skip = button("пропустить", "skip", { id: item.id });
        skip.className = "button-skip";
        skip.disabled = storageState !== "ready";
        actions.append(skip);
      }
    }
    const edit = button(item.status === "completed" ? "исправить запись" : "редактировать", "edit", { id: item.id });
    edit.setAttribute("aria-label", `${edit.textContent} «${displayTitle(item.title)}»`);
    const remove = button("удалить", "delete", { id: item.id });
    remove.className = "button-danger";
    remove.setAttribute("aria-label", `Удалить тренировку «${displayTitle(item.title)}»`);
    remove.disabled = storageState !== "ready";
    edit.disabled = storageState !== "ready" || (item.status !== "planned" && today() < MIN_DATE);
    actions.append(edit);
    if (item.status !== "completed") {
      const transfer = button("перенести", "transfer", { id: item.id });
      transfer.setAttribute("aria-label", `Перенести тренировку «${displayTitle(item.title)}»`);
      transfer.className = "button-transfer";
      transfer.disabled = storageState !== "ready" || today() > MAX_DATE;
      actions.append(transfer);
    }
    if (item.status !== "planned") {
      const reset = button("сбросить отметку", "reset", { id: item.id });
      reset.disabled = storageState !== "ready";
      actions.append(reset);
    }
    actions.append(remove);
    const overview = element("div", "training-overview");
    const copy = element("div", "training-copy");
    copy.append(details, status);
    const symbol = element("span", "activity-symbol", activitySymbol(item.title));
    symbol.setAttribute("aria-hidden", "true");
    overview.append(copy, symbol);
    card.append(heading, overview);
    if ((item.status !== "planned" && today() < MIN_DATE) || (item.status !== "completed" && today() > MAX_DATE)) card.append(element("p", "day-note", "дата вне доступного диапазона"));
    if (item.status === "planned" && item.date < today()) card.append(element("p", "day-note", "ожидает отметки"));
    if (item.status !== "planned") {
      const motivation = element("p", "training-motivation", resultMessage(item));
      motivation.dataset.category = resultCategory(item);
      card.append(motivation);
    }
    card.append(actions);
    return card;
  }
  function render() {
    $("week-title").textContent = formatWeek(selectedWeek);
    const currentWeek = weekStart(today());
    const activeWeekButton = selectedWeek < currentWeek ? "previous-week" : selectedWeek > currentWeek ? "next-week" : "current-week";
    ["previous-week", "current-week", "next-week"].forEach((id) => {
      const active = id === activeWeekButton;
      $(id).classList.toggle("is-active", active);
      if (active) $(id).setAttribute("aria-current", "true");
      else $(id).removeAttribute("aria-current");
    });
    $("previous-week").disabled = !validWeek(shiftDate(selectedWeek, -7));
    $("next-week").disabled = !validWeek(shiftDate(selectedWeek, 7));
    const dates = weekDates(selectedWeek);
    const fragment = document.createDocumentFragment();
    dates.forEach((value, index) => {
      const section = element("section", `day-section${value === today() ? " is-today" : ""}`);
      section.dataset.date = value;
      const header = element("div", "day-header");
      const heading = element("div", "day-heading");
      const title = element("h3", "", DAY_NAMES[index]);
      title.id = `day-${value}`;
      title.tabIndex = -1;
      section.setAttribute("aria-labelledby", title.id);
      heading.append(title, element("p", "day-date", formatDate(value)));
      if (value === today()) heading.append(element("span", "today-label", "сегодня"));
      const add = button("добавить тренировку", "add", { date: value });
      add.className = "add-training";
      add.setAttribute("aria-label", `Добавить тренировку на ${formatDate(value, true)}`);
      const full = trainingCount(value) >= DAY_LIMIT;
      add.disabled = storageState !== "ready" || !allowedDate(value) || full;
      header.append(heading, add);
      const cards = element("div", "day-cards");
      const records = data.workouts.filter((item) => item.date === value).sort((a, b) => a.createdAt - b.createdAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      if (!loaded) cards.append(element("p", "empty-day", "не удалось загрузить тренировки"));
      else if (!records.length) cards.append(element("p", "empty-day", "пока без тренировок"));
      else records.forEach((item) => cards.append(renderCard(item)));
      section.append(header, cards);
      if (!allowedDate(value)) section.append(element("p", "day-note", "дата вне доступного диапазона"));
      else if (full) section.append(element("p", "day-note", "достигнут лимит 15 тренировок"));
      fragment.append(section);
    });
    $("week-days").replaceChildren(fragment);
    const summary = calculateWeek(selectedWeek);
    $("empty-week").hidden = !loaded || summary.plannedCount !== 0;
    $("plan-training").disabled = storageState !== "ready" || !validWeek(selectedWeek);
    $("planned-count").textContent = loaded ? `${summary.plannedCount} ${plural(summary.plannedCount, ["занятие", "занятия", "занятий"])}` : "Не загружено";
    $("planned-time").textContent = loaded ? duration(summary.plannedMinutes) : "-";
    $("actual-count").textContent = loaded ? `${summary.completedCount} ${plural(summary.completedCount, ["занятие", "занятия", "занятий"])}` : "Не загружено";
    $("actual-time").textContent = loaded ? duration(summary.actualMinutes) : "-";
    const difference = summary.differenceMinutes;
    $("summary-difference").hidden = !loaded || !summary.plannedCount;
    $("summary-difference").textContent = difference > 0 ? `Больше плана на ${duration(difference)}` : difference < 0 ? `До планируемого времени ${duration(-difference)}` : "По времени ровно по плану";
    const note = weekNote(summary, selectedWeek);
    $("summary-note").textContent = note;
    $("summary-note").hidden = !loaded || !note;
    const category = weekCategory(summary, selectedWeek);
    $("summary-message").textContent = loaded ? choosePhrase(selectedWeek, WEEK_PHRASES[category]) : "";
    $("summary-message").dataset.category = category;
    $("summary-message").hidden = !loaded;
    $("storage-caption").textContent = storageState === "ready" ? "Данные сохраняются в этом браузере" : "Сохранение сейчас недоступно";
    $("clear-planner").textContent = canRecover() ? "Начать заново" : "Очистить все данные";
    $("clear-planner").disabled = storageState === "unavailable" || (storageState === "ready" && !data.workouts.length);
    $("clear-hint").hidden = storageState !== "ready" || data.workouts.length > 0;
  }
  function scrollTo(target) {
    target?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }
  function selectWeek(start) {
    if (!validWeek(start)) return;
    selectedWeek = start;
    render();
    scrollTo($("week-title"));
  }
  function notify(message) {
    clearTimeout(notificationTimer);
    $("notification").textContent = sentenceCase(message);
    $("notification").hidden = false;
    notificationTimer = setTimeout(() => { $("notification").hidden = true; }, 6000);
  }
  function clearNotification() {
    clearTimeout(notificationTimer);
    $("notification").hidden = true;
  }
  function clearErrors() {
    Object.keys(inputs).forEach((key) => { inputs[key].removeAttribute("aria-invalid"); errors[key].hidden = true; });
    $("save-error").hidden = true;
    $("delete-error").hidden = true;
    $("result-error").hidden = true;
    $("transfer-error").hidden = true;
    $("clear-error").hidden = true;
    $("transfer-date-error").hidden = true;
    $("transfer-date").removeAttribute("aria-invalid");
    Object.keys(resultInputs).forEach((key) => { resultInputs[key].removeAttribute("aria-invalid"); resultErrors[key].hidden = true; });
  }
  function showErrors(failures) {
    Object.entries(failures).forEach(([key, message]) => {
      errors[key].textContent = sentenceCase(message);
      errors[key].hidden = false;
      inputs[key].setAttribute("aria-invalid", "true");
    });
    const first = Object.keys(inputs).find((key) => failures[key]);
    if (first) inputs[first].focus();
  }
  function showPanel(id) {
    ["training-form", "result-form", "transfer-form", "delete-confirmation", "clear-confirmation"].forEach((panel) => { $(panel).hidden = panel !== id; });
    $("dialog-storage-update").hidden = !pendingRefresh;
  }
  function openForm(value, item, opener) {
    if (storageState !== "ready" || dialog.open || (item && item.status !== "planned" && today() < MIN_DATE)) return;
    clearNotification();
    editingId = item?.id || null;
    deletingId = null;
    resultId = null;
    confirmationResume = false;
    returnTarget = opener;
    returnDate = item?.date || value;
    clearErrors();
    showPanel("training-form");
    dialog.removeAttribute("aria-describedby");
    $("dialog-title").textContent = item ? (item.status === "completed" ? "Исправить запись" : "Редактировать тренировку") : "Новая тренировка";
    inputs.title.value = item?.title || "";
    inputs.date.value = item?.date || value;
    refreshDateBounds();
    $("date-correction-note").hidden = item?.status !== "completed";
    inputs.date.setAttribute("aria-describedby", item?.status === "completed" ? "date-error date-correction-note" : "date-error");
    inputs.hours.value = String(item ? Math.floor(item.plannedMinutes / 60) : 0);
    inputs.minutes.value = String(item ? item.plannedMinutes % 60 : 30);
    $("save-training").textContent = item ? "Сохранить изменения" : "Добавить";
    updateWriteAvailability();
    dialog.showModal();
    inputs.title.focus();
  }
  function openConfirmation(item, action, opener, resume = false) {
    if (storageState !== "ready" || (dialog.open && !resume)) return;
    clearNotification();
    deletingId = item.id;
    confirmationAction = action;
    confirmationResume = resume;
    editingId = null;
    if (!resume) returnTarget = opener;
    returnDate = item.date;
    if (resume) $("delete-error").hidden = true;
    else clearErrors();
    showPanel("delete-confirmation");
    const confirmations = {
      delete: ["Удалить тренировку?", `Удалить тренировку «${displayTitle(item.title)}»? Вернуть её после удаления не получится`, "Удалить"],
      reset: ["Сбросить отметку?", "Тренировка снова станет запланированной", "Сбросить"],
      skip: ["Заменить результат пропуском?", "Записанное фактическое время будет удалено", "Заменить"]
    };
    const [title, message, label] = confirmations[action];
    $("dialog-title").textContent = title;
    $("delete-message").textContent = message;
    $("confirm-delete").textContent = label;
    dialog.setAttribute("aria-describedby", "delete-message");
    $("confirm-delete").disabled = false;
    if (!dialog.open) dialog.showModal();
    $("cancel-delete").focus();
  }
  function closeDialog() {
    if (confirmationResume && !pendingRefresh) {
      confirmationResume = false;
      $("delete-confirmation").hidden = true;
      resultForm.hidden = false;
      dialog.removeAttribute("aria-describedby");
      $("dialog-title").textContent = "Результат тренировки";
      updateResultAvailability();
      $("skip-result").focus();
      return;
    }
    if (dialog.open) dialog.close();
  }
  function updateResultAvailability() {
    const item = data.workouts.find((record) => record.id === resultId);
    const unavailable = storageState !== "ready" || busy || pendingRefresh || !item || item.date > today();
    $("save-result").disabled = unavailable;
    $("skip-result").disabled = unavailable;
  }
  function openResult(item, opener) {
    if (dialog.open || storageState !== "ready" || item.date > today()) return;
    clearNotification();
    clearErrors();
    showPanel("result-form");
    editingId = deletingId = null;
    resultId = item.id;
    confirmationResume = false;
    returnTarget = opener;
    returnDate = item.date;
    dialog.removeAttribute("aria-describedby");
    $("dialog-title").textContent = "Результат тренировки";
    $("result-context").replaceChildren(element("p", "", displayTitle(item.title)), element("p", "", formatDate(item.date, true)), element("p", "", `план - ${duration(item.plannedMinutes)}`));
    const actual = item.status === "completed" ? item.actualMinutes : 0;
    resultInputs.hours.value = String(Math.floor(actual / 60));
    resultInputs.minutes.value = String(actual % 60);
    $("skip-result").hidden = item.status === "skipped";
    updateResultAvailability();
    dialog.showModal();
    resultInputs.hours.focus();
  }
  function restoreFocus() {
    if (returnTarget?.isConnected && !returnTarget.disabled) returnTarget.focus({ preventScroll: true });
    else {
      const action = returnTarget?.dataset.action;
      const id = returnTarget?.dataset.id;
      const replacement = id && action ? document.querySelector(`button[data-action="${action}"][data-id="${CSS.escape(id)}"]`) : null;
      const heading = returnDate ? $(`day-${returnDate}`) : null;
      ((replacement && !replacement.disabled ? replacement : null) || heading || $("week-title")).focus({ preventScroll: true });
    }
  }
  function parseDurationInput(failures, fields = inputs, actual = false) {
    const values = {};
    ["hours", "minutes"].forEach((key) => {
      const raw = fields[key].value.trim();
      if (raw !== "" && !/^\d+$/.test(raw)) failures[key] = "введи целое неотрицательное число";
      else values[key] = raw === "" ? 0 : Number(raw);
    });
    if (values.minutes > 59) failures.minutes = "минуты должны быть от 0 до 59";
    if (values.hours > 24) failures.hours = "продолжительность должна быть не больше 24 часов";
    const result = values.hours * 60 + values.minutes;
    if (!failures.hours && !failures.minutes) {
      if (result > 1440) failures.hours = "продолжительность должна быть не больше 24 часов";
      else if (result === 0) failures.hours = actual ? "укажи время больше нуля или отметь пропуск" : "запланируй хотя бы 1 минуту";
    }
    return result;
  }
  function trainingInput() {
    const failures = {};
    const title = normalizeTitle(inputs.title.value);
    const date = inputs.date.value;
    const old = editingId ? data.workouts.find((item) => item.id === editingId) : null;
    if (!title) failures.title = "напиши название активности";
    else if ([...title].length > 80) failures.title = "название должно быть не длиннее 80 символов";
    if (!allowedDate(date)) failures.date = "выбери корректную дату от 01.01.1900 до 31.12.2099";
    else if (old && old.status !== "planned" && date > today()) failures.date = "у отмеченной тренировки дата не может быть в будущем";
    else if (trainingCount(date, old?.id) >= DAY_LIMIT && (!old || old.date !== date)) failures.date = MESSAGES.capacity;
    const plannedMinutes = parseDurationInput(failures);
    return { failures, title, date, old, plannedMinutes };
  }
  function transferDateError(item, date) {
    if (!allowedDate(date)) return "выбери корректную дату от 01.01.1900 до 31.12.2099";
    if (date === item.date) return "выбери другую дату";
    if (date < today()) return "перенести можно на сегодня или будущую дату";
    if (trainingCount(date, item.id) >= DAY_LIMIT) return MESSAGES.capacity;
    return "";
  }
  function refreshVisibleErrors(fields, messages, failures) {
    const durationError = ["hours", "minutes"].some((key) => fields[key] && (!messages[key].hidden || fields[key].hasAttribute("aria-invalid")));
    Object.keys(fields).forEach((key) => {
      // До первой отправки не показываем ошибки в ещё не заполненной форме.
      if (messages[key].hidden && !fields[key].hasAttribute("aria-invalid") && !(durationError && (key === "hours" || key === "minutes"))) return;
      messages[key].hidden = !failures[key];
      if (failures[key]) {
        messages[key].textContent = sentenceCase(failures[key]);
        fields[key].setAttribute("aria-invalid", "true");
      } else fields[key].removeAttribute("aria-invalid");
    });
  }
  function refreshTrainingErrors() {
    if (!form.hidden) refreshVisibleErrors(inputs, errors, trainingInput().failures);
  }
  function refreshResultErrors() {
    if (resultForm.hidden) return;
    const failures = {};
    parseDurationInput(failures, resultInputs, true);
    refreshVisibleErrors(resultInputs, resultErrors, failures);
  }
  function refreshTransferErrors() {
    if (transferForm.hidden) return;
    const item = data.workouts.find((record) => record.id === transferId);
    if (item) refreshVisibleErrors({ date: $("transfer-date") }, { date: $("transfer-date-error") }, { date: transferDateError(item, $("transfer-date").value) });
  }
  function newIdentifier() {
    let id;
    do {
      id = typeof window.crypto?.randomUUID === "function" ? window.crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    } while (data.workouts.some((item) => item.id === id));
    return id;
  }
  function highlightRecord(id, value) {
    selectedWeek = weekStart(value);
    render();
    const target = document.querySelector(`article[data-id="${CSS.escape(id)}"]`);
    if (target) {
      scrollTo(target);
      target.classList.add("highlighted");
      setTimeout(() => { target.classList.remove("highlighted"); }, 2000);
    }
  }
  function submitTraining(event) {
    event.preventDefault();
    updateWriteAvailability();
    if (!dialog.open || form.hidden || $("save-training").disabled) return;
    clearErrors();
    const { failures, title, date, old, plannedMinutes } = trainingInput();
    if (Object.keys(failures).length) { showErrors(failures); return; }
    if (old && old.title === title && old.date === date && old.plannedMinutes === plannedMinutes) { closeDialog(); return; }
    const now = Date.now();
    const item = old ? { ...old, title, date, plannedMinutes, updatedAt: now } : {
      id: newIdentifier(), title, date, plannedMinutes, actualMinutes: null, status: "planned", createdAt: now, updatedAt: now
    };
    const candidate = { version: 1, workouts: old ? data.workouts.map((record) => record.id === old.id ? item : record) : [...data.workouts, item] };
    if (!commit(candidate, $("save-error"))) return;
    returnDate = item.date;
    closeDialog();
    highlightRecord(item.id, item.date);
    notify(old ? "изменения сохранены" : "тренировка добавлена 🌿");
  }
  function changeResult(item, status, actualMinutes, errorElement) {
    if (busy || pendingRefresh || storageState !== "ready") return false;
    if (status !== "planned" && item.date > today()) {
      errorElement.textContent = "Результат можно отметить начиная с даты тренировки";
      errorElement.hidden = false;
      return false;
    }
    if (item.status === status && item.actualMinutes === actualMinutes) return true;
    const updated = { ...item, status, actualMinutes, updatedAt: Date.now() };
    return commit({ version: 1, workouts: data.workouts.map((record) => record.id === item.id ? updated : record) }, errorElement);
  }
  function submitResult(event) {
    event.preventDefault();
    if (!dialog.open || resultForm.hidden || busy || pendingRefresh || storageState !== "ready") return;
    clearErrors();
    const item = data.workouts.find((record) => record.id === resultId);
    if (!item) return;
    if (item.date > today()) {
      $("result-error").textContent = "Результат можно отметить начиная с даты тренировки";
      $("result-error").hidden = false;
      return;
    }
    const failures = {};
    const actual = parseDurationInput(failures, resultInputs, true);
    if (Object.keys(failures).length) {
      Object.entries(failures).forEach(([key, message]) => {
        resultErrors[key].textContent = sentenceCase(message);
        resultErrors[key].hidden = false;
        resultInputs[key].setAttribute("aria-invalid", "true");
      });
      resultInputs[Object.keys(resultInputs).find((key) => failures[key])].focus();
      return;
    }
    if (item.status === "completed" && item.actualMinutes === actual) { closeDialog(); return; }
    if (!changeResult(item, "completed", actual, $("result-error"))) return;
    closeDialog();
    notify(resultMessage({ ...item, status: "completed", actualMinutes: actual }));
  }
  function skipTraining(item, opener, fromResult = false) {
    if (busy || pendingRefresh || storageState !== "ready") return;
    if (item.status === "completed") { openConfirmation(item, "skip", opener, fromResult); return; }
    const error = fromResult ? $("result-error") : element("p", "save-error");
    if (!fromResult) {
      error.setAttribute("role", "alert");
      opener.closest("article").querySelector(".save-error")?.remove();
      opener.closest("article").append(error);
      clearNotification();
    }
    if (!changeResult(item, "skipped", 0, error)) return;
    if (fromResult) closeDialog();
    else document.querySelector(`button[data-action="result"][data-id="${CSS.escape(item.id)}"]`)?.focus({ preventScroll: true });
    notify(resultMessage({ ...item, status: "skipped", actualMinutes: 0 }));
  }
  function confirmOperation() {
    if (!dialog.open || $("delete-confirmation").hidden || !deletingId || busy || pendingRefresh || storageState !== "ready") return;
    const item = data.workouts.find((record) => record.id === deletingId);
    if (!item) return;
    if (confirmationAction === "delete") {
      const candidate = { version: 1, workouts: data.workouts.filter((record) => record.id !== deletingId) };
      if (!commit(candidate, $("delete-error"))) return;
    } else if (!changeResult(item, confirmationAction === "reset" ? "planned" : "skipped", confirmationAction === "reset" ? null : 0, $("delete-error"))) return;
    confirmationResume = false;
    closeDialog();
    notify(confirmationAction === "delete" ? "тренировка удалена" : confirmationAction === "reset" ? "отметка сброшена" : resultMessage({ ...item, status: "skipped", actualMinutes: 0 }));
  }
  function openTransfer(item, opener) {
    if (dialog.open || storageState !== "ready" || item.status === "completed" || today() > MAX_DATE) return;
    clearNotification();
    clearErrors();
    showPanel("transfer-form");
    editingId = deletingId = resultId = null;
    transferId = item.id;
    confirmationResume = false;
    returnTarget = opener;
    returnDate = item.date;
    dialog.removeAttribute("aria-describedby");
    $("dialog-title").textContent = "Перенести тренировку";
    $("transfer-context").replaceChildren(element("p", "", displayTitle(item.title)), element("p", "", `исходная дата - ${formatDate(item.date, true)}, ${formatWeekday(item.date)}`), element("p", "", `план - ${duration(item.plannedMinutes)}`));
    $("transfer-date").value = "";
    updateTransferWeekday();
    refreshDateBounds();
    updateWriteAvailability();
    dialog.showModal();
    $("transfer-date").focus();
  }
  function updateTransferWeekday() {
    const date = $("transfer-date").value;
    const label = $("transfer-weekday");
    label.textContent = allowedDate(date) ? formatWeekday(date) : "";
    label.hidden = !label.textContent;
  }
  function submitTransfer(event) {
    event.preventDefault();
    updateWriteAvailability();
    if (!dialog.open || transferForm.hidden || $("save-transfer").disabled) return;
    clearErrors();
    const item = data.workouts.find((record) => record.id === transferId);
    if (!item || item.status === "completed") return;
    const date = $("transfer-date").value;
    const message = transferDateError(item, date);
    if (message) {
      $("transfer-date-error").textContent = sentenceCase(message);
      $("transfer-date-error").hidden = false;
      $("transfer-date").setAttribute("aria-invalid", "true");
      $("transfer-date").focus();
      return;
    }
    const acrossWeeks = weekStart(item.date) !== weekStart(date);
    const updated = { ...item, date, status: "planned", actualMinutes: null, updatedAt: Date.now() };
    if (!commit({ version: 1, workouts: data.workouts.map((record) => record.id === item.id ? updated : record) }, $("transfer-error"))) return;
    returnDate = date;
    closeDialog();
    highlightRecord(item.id, date);
    notify(acrossWeeks ? `тренировка перенесена на ${formatDate(date, true)} и теперь входит в план этой недели 🌿` : `тренировка перенесена на ${formatDate(date, true)}. План гибкий, как после растяжки 🙂`);
  }
  function openClear(opener) {
    if (dialog.open || storageState === "unavailable" || (storageState === "ready" && !data.workouts.length)) return;
    clearNotification();
    clearErrors();
    showPanel("clear-confirmation");
    editingId = deletingId = resultId = transferId = null;
    confirmationResume = false;
    recoveryMode = canRecover();
    returnTarget = opener;
    returnDate = null;
    $("clear-understood").checked = false;
    $("dialog-title").textContent = recoveryMode ? "Удалить непрочитанные данные?" : "Очистить планировщик?";
    $("clear-message").textContent = recoveryMode ? "Сохранённые данные этого планировщика будут удалены без восстановления" : "Все тренировки за все недели будут удалены без восстановления";
    $("confirm-clear").textContent = recoveryMode ? "Удалить данные и начать заново" : "Удалить все тренировки";
    dialog.setAttribute("aria-describedby", "clear-message");
    updateWriteAvailability();
    dialog.showModal();
    $("cancel-clear").focus();
  }
  function confirmClear() {
    if (!dialog.open || $("clear-confirmation").hidden || !$("clear-understood").checked || pendingRefresh || busy) return;
    if (!commit({ version: 1, workouts: [] }, $("clear-error"), recoveryMode)) return;
    selectedWeek = weekStart(today());
    render();
    closeDialog();
    scrollTo($("week-title"));
    notify("планировщик очищен. Можно начать с нового плана 🌿");
  }
  function refreshFromStorage() {
    // Событие не содержит гарантированно последнее значение: читаем сам ключ.
    const position = window.scrollY;
    clearNotification();
    loadData();
    render();
    window.scrollTo({ top: position, behavior: "instant" });
  }
  function storageChanged(event) {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    try { if (event.storageArea !== window.localStorage) return; }
    catch {
      storageState = "unavailable";
      showStorageMessage(storageState);
      render();
      if (!dialog.open) return;
    }
    if (dialog.open) {
      pendingRefresh = true;
      $("dialog-storage-update").hidden = false;
      updateWriteAvailability();
    } else refreshFromStorage();
  }
  function checkDateChange() {
    const currentDate = today();
    if (currentDate === lastToday) return;
    lastToday = currentDate;
    const active = document.activeElement;
    const activeDate = active.closest(".day-section")?.dataset.date;
    const activeId = active.dataset.id;
    const activeAction = active.dataset.action;
    render();
    if (!dialog.open && activeDate) {
      const replacement = activeId && activeAction ? document.querySelector(`button[data-action="${activeAction}"][data-id="${CSS.escape(activeId)}"]`) : null;
      (replacement || $(`day-${activeDate}`))?.focus({ preventScroll: true });
    }
    updateWriteAvailability();
  }
  function retryStorage() {
    if (busy || pendingRefresh) return;
    const inDialog = dialog.open;
    if (!inDialog) {
      if (!loadData()) { render(); return; }
    }
    const recheckRecovery = inDialog && (canRecover() || (recoveryMode && !$("clear-confirmation").hidden));
    try {
      // В открытой обычной форме проверяем хранение без перезагрузки черновика.
      // Внешнее изменение данных блокируется общим обработчиком storage.
      probeStorage();
      if (recheckRecovery) {
        // Восстановленные данные нельзя удалить старым подтверждением.
        if (loadData()) {
          pendingRefresh = true;
          $("dialog-storage-update").hidden = false;
        }
        render();
        updateWriteAvailability();
        ($("dialog-storage-retry").hidden ? $("cancel-clear") : $("retry-storage-dialog")).focus();
        return;
      }
      storageState = "ready";
      hideStorageMessage();
      ["save-error", "result-error", "transfer-error", "delete-error", "clear-error"].forEach((id) => { $(id).hidden = true; });
    } catch {
      storageState = "unavailable";
      showStorageMessage(storageState);
    }
    render();
    updateWriteAvailability();
    if (inDialog && $("dialog-storage-retry").hidden) {
      const action = ["save-training", "save-result", "save-transfer", "confirm-delete", "confirm-clear"].map($).find((control) => !control.disabled && control.getClientRects().length);
      (action || $("close-dialog")).focus();
    }
  }
  function start() {
    loadData();
    render();
    $("previous-week").addEventListener("click", () => selectWeek(shiftDate(selectedWeek, -7)));
    $("next-week").addEventListener("click", () => selectWeek(shiftDate(selectedWeek, 7)));
    $("current-week").addEventListener("click", () => selectWeek(weekStart(today())));
    $("plan-training").addEventListener("click", (event) => {
      const defaultDate = selectedWeek === weekStart(today()) && allowedDate(today()) ? today() : weekDates(selectedWeek).find(allowedDate);
      openForm(defaultDate, null, event.currentTarget);
    });
    $("week-days").addEventListener("click", (event) => {
      const target = event.target.closest("button[data-action]");
      if (!target || target.disabled) return;
      if (target.dataset.action === "add") openForm(target.dataset.date, null, target);
      else {
        const item = data.workouts.find((record) => record.id === target.dataset.id);
        if (!item) return;
        if (target.dataset.action === "edit") openForm(item.date, item, target);
        if (target.dataset.action === "delete") openConfirmation(item, "delete", target);
        if (target.dataset.action === "result") openResult(item, target);
        if (target.dataset.action === "skip") skipTraining(item, target);
        if (target.dataset.action === "reset") openConfirmation(item, "reset", target);
        if (target.dataset.action === "transfer") openTransfer(item, target);
      }
    });
    $("retry-storage").addEventListener("click", retryStorage);
    $("retry-storage-dialog").addEventListener("click", retryStorage);
    [[form, refreshTrainingErrors], [resultForm, refreshResultErrors], [transferForm, refreshTransferErrors]].forEach(([panel, refresh]) => {
      panel.addEventListener("input", refresh);
      panel.addEventListener("change", refresh);
    });
    form.addEventListener("submit", submitTraining);
    resultForm.addEventListener("submit", submitResult);
    transferForm.addEventListener("submit", submitTransfer);
    $("transfer-date").addEventListener("input", updateTransferWeekday);
    $("transfer-date").addEventListener("change", updateTransferWeekday);
    $("clear-planner").addEventListener("click", (event) => openClear(event.currentTarget));
    $("clear-understood").addEventListener("change", updateWriteAvailability);
    $("confirm-clear").addEventListener("click", confirmClear);
    $("skip-result").addEventListener("click", (event) => {
      const item = data.workouts.find((record) => record.id === resultId);
      if (item) skipTraining(item, event.currentTarget, true);
    });
    $("confirm-delete").addEventListener("click", confirmOperation);
    ["close-dialog", "cancel-form", "cancel-delete", "cancel-result", "cancel-transfer", "cancel-clear"].forEach((id) => $(id).addEventListener("click", closeDialog));
    dialog.addEventListener("cancel", (event) => {
      if (confirmationResume) { event.preventDefault(); closeDialog(); }
    });
    dialog.addEventListener("close", () => {
      confirmationResume = false;
      if (pendingRefresh) {
        pendingRefresh = false;
        $("dialog-storage-update").hidden = true;
        refreshFromStorage();
        updateWriteAvailability();
      }
      restoreFocus();
    });
    // Нативный диалог допускает уход Tab в интерфейс браузера после последней кнопки.
    // Замыкаем только границы; управление сегментами поля даты остаётся нативным.
    dialog.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return;
      const controls = [...dialog.querySelectorAll("button:not(:disabled), input:not(:disabled)")].filter((control) => control.getClientRects().length);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    });
    const outside = (event) => {
      const rect = dialog.getBoundingClientRect();
      return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
    };
    dialog.addEventListener("pointerdown", (event) => { pointerStartedOutside = outside(event); });
    dialog.addEventListener("pointerup", (event) => {
      if (pointerStartedOutside && outside(event)) closeDialog();
      pointerStartedOutside = false;
    });
    window.addEventListener("focus", checkDateChange);
    window.addEventListener("storage", storageChanged);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) checkDateChange(); });
    window.setInterval(checkDateChange, 60000);
  }

  start();
})();
