const STORAGE_KEY = "lms_data_v1";
const SESSION_KEY = "lms_session_v1";
const ADMIN_CREDENTIALS = {
username: "librarian_1",
password: "lib@123"};


const ADMIN_OPTION_CARD_IDS = [
  "add-student-card",
  "add-book-card",
  "students-manage-card",
  "books-manage-card"
];

const state = {
  students: [],
  books: [],
  loans: []
};

const session = {
  role: null,
  studentUid: null
};

const els = {
  authWrap: document.getElementById("auth-wrap"),
  appShell: document.getElementById("app-shell"),
  sessionBar: document.getElementById("session-bar"),
  sessionRole: document.getElementById("session-role"),
  sessionUser: document.getElementById("session-user"),
  logoutBtn: document.getElementById("logout-btn"),

  adminLoginForm: document.getElementById("admin-login-form"),
  adminUsername: document.getElementById("admin-username"),
  adminPassword: document.getElementById("admin-password"),

  studentLoginForm: document.getElementById("student-login-form"),
  studentLoginId: document.getElementById("student-login-id"),
  adminLoginCard: document.getElementById("admin-login-card"),
  studentLoginCard: document.getElementById("student-login-card"),
  roleChoiceBtns: document.querySelectorAll("[data-role-choice]"),

  studentForm: document.getElementById("student-form"),
  studentName: document.getElementById("student-name"),
  studentId: document.getElementById("student-id"),

  bookForm: document.getElementById("book-form"),
  bookTitle: document.getElementById("book-title"),
  bookAuthor: document.getElementById("book-author"),
  bookIsbn: document.getElementById("book-isbn"),

  issueForm: document.getElementById("issue-form"),
  issueStudent: document.getElementById("issue-student"),
  issueBook: document.getElementById("issue-book"),
  issueDate: document.getElementById("issue-date"),
  dueDate: document.getElementById("due-date"),

  activeLoansBody: document.getElementById("active-loans-body"),
  historyBody: document.getElementById("history-body"),
  activeSearch: document.getElementById("active-search"),
  historySearch: document.getElementById("history-search"),
  activeActionHead: document.getElementById("active-action-head"),
  statLabel1: document.getElementById("stat-label-1"),
  statLabel2: document.getElementById("stat-label-2"),
  statLabel3: document.getElementById("stat-label-3"),
  statLabel4: document.getElementById("stat-label-4"),
  statValue1: document.getElementById("stat-value-1"),
  statValue2: document.getElementById("stat-value-2"),
  statValue3: document.getElementById("stat-value-3"),
  statValue4: document.getElementById("stat-value-4"),
  studentsManageBody: document.getElementById("students-manage-body"),
  booksManageBody: document.getElementById("books-manage-body"),
  panelActionBtns: document.querySelectorAll("[data-open-target]")
};

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function diffDays(fromDateStr, toDateStr) {
  const start = new Date(fromDateStr);
  const end = new Date(toDateStr);
  const ms = end.getTime() - start.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function saveSession() {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    state.students = Array.isArray(parsed.students) ? parsed.students : [];
    state.books = Array.isArray(parsed.books) ? parsed.books : [];
    state.loans = Array.isArray(parsed.loans) ? parsed.loans : [];
  } catch {
    console.warn("Could not parse saved data.");
  }
}

function loadSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    session.role = parsed?.role || null;
    session.studentUid = parsed?.studentUid || null;
  } catch {
    console.warn("Could not parse session data.");
  }
}

function getStudent(studentUid) {
  return state.students.find((s) => s.uid === studentUid);
}

function getBook(bookUid) {
  return state.books.find((b) => b.uid === bookUid);
}

function normalizeStudentName(name) {
  return String(name).toLowerCase().replaceAll(/[^a-z]/g, "");
}

function getStudentByLoginId(loginId) {
  const m = String(loginId).toLowerCase().trim().match(/^([a-z]+)@(\d{3})$/);
  if (!m) return null;

  const namePart = m[1];
  const digitsPart = m[2];

  return state.students.find((s) => {
    const normalizedName = normalizeStudentName(s.name);
    const idDigits = String(s.studentId).replaceAll(/\D/g, "");
    const lastThree = idDigits.slice(-3);
    return normalizedName === namePart && lastThree === digitsPart;
  });
}

function isAdmin() {
  return session.role === "admin";
}

function isStudent() {
  return session.role === "student";
}

function ensureLoggedIn() {
  if (session.role) return true;
  alert("Please log in first.");
  return false;
}

function ensureAdmin() {
  if (!ensureLoggedIn()) return false;
  if (isAdmin()) return true;
  alert("Only library management can perform this action.");
  return false;
}

function formatSessionUser() {
  if (isAdmin()) return "Library Manager";
  if (!isStudent()) return "";
  const student = getStudent(session.studentUid);
  if (!student) return "Student";
  return `${student.name} (${student.studentId})`;
}

function updateAccessUI() {
  const loggedIn = !!session.role;
  els.authWrap.classList.toggle("hidden", loggedIn);
  els.appShell.classList.toggle("hidden", !loggedIn);
  els.sessionBar.classList.toggle("hidden", !loggedIn);

  document.body.classList.remove("role-admin", "role-student");
  if (isAdmin()) document.body.classList.add("role-admin");
  if (isStudent()) document.body.classList.add("role-student");

  if (!loggedIn) return;

  els.sessionRole.textContent = isAdmin() ? "Library" : "Student";
  els.sessionUser.textContent = formatSessionUser();
  els.activeActionHead.textContent = isAdmin() ? "Action" : "";
}

function clearSession() {
  session.role = null;
  session.studentUid = null;
  saveSession();
}

function loginAsAdmin(username, password) {
  if (username !== ADMIN_CREDENTIALS.username || password !== ADMIN_CREDENTIALS.password) {
    alert("Invalid library credentials.");
    return false;
  }

  session.role = "admin";
  session.studentUid = null;
  saveSession();
  return true;
}

function loginAsStudent(loginId) {
  const isValidFormat = /^([a-z]+)@(\d{3})$/i.test(String(loginId).trim());
  if (!isValidFormat) {
    alert("Use student login format: name@123");
    return false;
  }

  const student = getStudentByLoginId(loginId);
  if (!student) {
    alert("Student login not found. Use name@last3digitsOfStudentID.");
    return false;
  }

  session.role = "student";
  session.studentUid = student.uid;
  saveSession();
  return true;
}

function setAuthRole(role) {
  const showAdmin = role === "admin";
  const showStudent = role === "student";
  els.adminLoginCard.classList.toggle("hidden", !showAdmin);
  els.studentLoginCard.classList.toggle("hidden", !showStudent);

  els.roleChoiceBtns.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.roleChoice === role);
  });
}

function showAdminOptionCard(targetId) {
  const target = targetId ? document.getElementById(targetId) : null;
  const isAlreadyVisible = !!target && !target.classList.contains("hidden");

  ADMIN_OPTION_CARD_IDS.forEach((cardId) => {
    const card = document.getElementById(cardId);
    if (card) card.classList.add("hidden");
  });

  if (!targetId || isAlreadyVisible) return;
  if (!target) return;
  target.classList.remove("hidden");
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

function isBookOnLoan(bookUid) {
  return state.loans.some((l) => l.bookUid === bookUid && !l.returnDate);
}

function populateIssueSelectors() {
  const studentOptions = state.students
    .map((s) => `<option value="${s.uid}">${escapeHtml(s.name)} (${escapeHtml(s.studentId)})</option>`)
    .join("");

  els.issueStudent.innerHTML = `<option value="">Select student</option>${studentOptions}`;

  const availableBooks = state.books.filter((b) => !isBookOnLoan(b.uid));
  const bookOptions = availableBooks
    .map((b) => `<option value="${b.uid}">${escapeHtml(b.title)} - ${escapeHtml(b.author)}</option>`)
    .join("");

  els.issueBook.innerHTML = `<option value="">Select available book</option>${bookOptions}`;
}

function statusForLoan(loan) {
  if (loan.returnDate) return { label: "Returned", css: "ok" };
  const now = todayISO();
  if (now > loan.dueDate) return { label: "Overdue", css: "overdue" };
  if (now === loan.dueDate) return { label: "Due Today", css: "warn" };
  return { label: "On Time", css: "ok" };
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function animateNumber(el, nextValue) {
  const finalValue = Number(nextValue) || 0;
  const currentValue = Number(el.dataset.value || 0);
  if (currentValue === finalValue) {
    el.textContent = String(finalValue);
    return;
  }

  const startedAt = performance.now();
  const duration = 360;

  function tick(now) {
    const progress = Math.min(1, (now - startedAt) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(currentValue + (finalValue - currentValue) * eased);
    el.textContent = String(value);

    if (progress < 1) {
      requestAnimationFrame(tick);
      return;
    }

    el.dataset.value = String(finalValue);
  }

  requestAnimationFrame(tick);
}

function renderStats() {
  const allActive = state.loans.filter((loan) => !loan.returnDate);
  const allOverdue = allActive.filter((loan) => todayISO() > loan.dueDate);

  if (isAdmin()) {
    els.statLabel1.textContent = "Total Students";
    els.statLabel2.textContent = "Total Books";
    els.statLabel3.textContent = "Active Loans";
    els.statLabel4.textContent = "Overdue Loans";

    animateNumber(els.statValue1, state.students.length);
    animateNumber(els.statValue2, state.books.length);
    animateNumber(els.statValue3, allActive.length);
    animateNumber(els.statValue4, allOverdue.length);
    return;
  }

  const myAll = state.loans.filter((loan) => loan.studentUid === session.studentUid);
  const myActive = myAll.filter((loan) => !loan.returnDate);
  const myReturned = myAll.filter((loan) => !!loan.returnDate);
  const myOverdue = myActive.filter((loan) => todayISO() > loan.dueDate);

  els.statLabel1.textContent = "My Active Loans";
  els.statLabel2.textContent = "My Returned";
  els.statLabel3.textContent = "Library Books";
  els.statLabel4.textContent = "My Overdue";

  animateNumber(els.statValue1, myActive.length);
  animateNumber(els.statValue2, myReturned.length);
  animateNumber(els.statValue3, state.books.length);
  animateNumber(els.statValue4, myOverdue.length);
}

function renderActiveLoans() {
  if (!session.role) {
    els.activeLoansBody.innerHTML = `<tr><td colspan="7" class="empty">Please log in.</td></tr>`;
    return;
  }

  const q = els.activeSearch.value.trim().toLowerCase();
  const active = state.loans.filter((l) => {
    if (l.returnDate) return false;
    if (isAdmin()) return true;
    return l.studentUid === session.studentUid;
  });

  const filtered = active.filter((loan) => {
    const student = getStudent(loan.studentUid);
    const book = getBook(loan.bookUid);
    const hay = `${student?.name || ""} ${student?.studentId || ""} ${book?.title || ""} ${book?.author || ""}`.toLowerCase();
    return hay.includes(q);
  });

  if (filtered.length === 0) {
    els.activeLoansBody.innerHTML = `<tr><td colspan="7" class="empty">No active loans.</td></tr>`;
    return;
  }

  els.activeLoansBody.innerHTML = filtered
    .map((loan) => {
      const student = getStudent(loan.studentUid);
      const book = getBook(loan.bookUid);
      const now = todayISO();
      const borrowedDays = diffDays(loan.issueDate, now);
      const status = statusForLoan(loan);

      return `
        <tr>
          <td>${escapeHtml(student?.name || "Unknown")}</td>
          <td>${escapeHtml(book?.title || "Unknown")}</td>
          <td>${loan.issueDate}</td>
          <td>${loan.dueDate}</td>
          <td>${borrowedDays}</td>
          <td><span class="status ${status.css}">${status.label}</span></td>
          <td class="action-cell">${isAdmin() ? `<button class="btn btn-secondary" data-return-id="${loan.uid}">Return</button>` : "-"}</td>
        </tr>
      `;
    })
    .join("");
}

function renderHistory() {
  if (!session.role) {
    els.historyBody.innerHTML = `<tr><td colspan="6" class="empty">Please log in.</td></tr>`;
    return;
  }

  const q = els.historySearch.value.trim().toLowerCase();
  const returned = state.loans.filter((l) => {
    if (!l.returnDate) return false;
    if (isAdmin()) return true;
    return l.studentUid === session.studentUid;
  });

  const filtered = returned.filter((loan) => {
    const student = getStudent(loan.studentUid);
    const book = getBook(loan.bookUid);
    const hay = `${student?.name || ""} ${student?.studentId || ""} ${book?.title || ""} ${book?.author || ""}`.toLowerCase();
    return hay.includes(q);
  });

  if (filtered.length === 0) {
    els.historyBody.innerHTML = `<tr><td colspan="6" class="empty">No loan history yet.</td></tr>`;
    return;
  }

  els.historyBody.innerHTML = filtered
    .sort((a, b) => (a.returnDate < b.returnDate ? 1 : -1))
    .map((loan) => {
      const student = getStudent(loan.studentUid);
      const book = getBook(loan.bookUid);
      const totalDays = diffDays(loan.issueDate, loan.returnDate);

      return `
        <tr>
          <td>${escapeHtml(student?.name || "Unknown")}</td>
          <td>${escapeHtml(book?.title || "Unknown")}</td>
          <td>${loan.issueDate}</td>
          <td>${loan.dueDate}</td>
          <td>${loan.returnDate}</td>
          <td>${totalDays}</td>
        </tr>
      `;
    })
    .join("");
}

function loginIdForStudent(student) {
  const namePart = normalizeStudentName(student.name);
  const digits = String(student.studentId).replaceAll(/\D/g, "").slice(-3);
  return digits ? `${namePart}@${digits}` : `${namePart}@000`;
}

function renderManageStudents() {
  if (!isAdmin()) {
    els.studentsManageBody.innerHTML = "";
    return;
  }

  if (state.students.length === 0) {
    els.studentsManageBody.innerHTML = `<tr><td colspan="4" class="empty">No students available.</td></tr>`;
    return;
  }

  els.studentsManageBody.innerHTML = state.students
    .map((student) => `
      <tr>
        <td>${escapeHtml(student.name)}</td>
        <td>${escapeHtml(student.studentId)}</td>
        <td>${escapeHtml(loginIdForStudent(student))}</td>
        <td><button class="btn btn-danger" data-delete-student-id="${student.uid}">Delete</button></td>
      </tr>
    `)
    .join("");
}

function renderManageBooks() {
  if (!isAdmin()) {
    els.booksManageBody.innerHTML = "";
    return;
  }

  if (state.books.length === 0) {
    els.booksManageBody.innerHTML = `<tr><td colspan="4" class="empty">No books available.</td></tr>`;
    return;
  }

  els.booksManageBody.innerHTML = state.books
    .map((book) => `
      <tr>
        <td>${escapeHtml(book.title)}</td>
        <td>${escapeHtml(book.author)}</td>
        <td>${escapeHtml(book.isbn)}</td>
        <td><button class="btn btn-danger" data-delete-book-id="${book.uid}">Delete</button></td>
      </tr>
    `)
    .join("");
}

function deleteStudent(studentUid) {
  const hasLoans = state.loans.some((loan) => loan.studentUid === studentUid);
  if (hasLoans) {
    alert("Cannot delete this student because loan records exist.");
    return false;
  }

  state.students = state.students.filter((s) => s.uid !== studentUid);
  return true;
}

function deleteBook(bookUid) {
  const hasLoans = state.loans.some((loan) => loan.bookUid === bookUid);
  if (hasLoans) {
    alert("Cannot delete this book because loan records exist.");
    return false;
  }

  state.books = state.books.filter((b) => b.uid !== bookUid);
  return true;
}

function renderAll() {
  updateAccessUI();
  if (!session.role) return;
  renderStats();
  populateIssueSelectors();
  renderActiveLoans();
  renderHistory();
  renderManageStudents();
  renderManageBooks();
}

function addStudent(name, studentId) {
  const exists = state.students.some((s) => s.studentId.toLowerCase() === studentId.toLowerCase());
  if (exists) {
    alert("Student ID already exists.");
    return false;
  }

  state.students.push({
    uid: uid("stu"),
    name,
    studentId
  });
  return true;
}

function addBook(title, author, isbn) {
  const exists = state.books.some((b) => b.isbn.toLowerCase() === isbn.toLowerCase());
  if (exists) {
    alert("Book ISBN/Code already exists.");
    return false;
  }

  state.books.push({
    uid: uid("bk"),
    title,
    author,
    isbn
  });
  return true;
}

function issueBook(studentUid, bookUid, issueDate, dueDate) {
  if (dueDate < issueDate) {
    alert("Due date cannot be earlier than issue date.");
    return false;
  }

  if (isBookOnLoan(bookUid)) {
    alert("This book is already on active loan.");
    return false;
  }

  state.loans.push({
    uid: uid("loan"),
    studentUid,
    bookUid,
    issueDate,
    dueDate,
    returnDate: null
  });

  return true;
}

function returnBook(loanUid) {
  const loan = state.loans.find((l) => l.uid === loanUid);
  if (!loan || loan.returnDate) return;
  loan.returnDate = todayISO();
}

function bindEvents() {
  els.studentForm.addEventListener("submit", (e) => {
    if (!ensureAdmin()) return;
    e.preventDefault();
    const name = els.studentName.value.trim();
    const sid = els.studentId.value.trim();
    if (!name || !sid) return;

    if (addStudent(name, sid)) {
      save();
      renderAll();
      els.studentForm.reset();
    }
  });

  els.bookForm.addEventListener("submit", (e) => {
    if (!ensureAdmin()) return;
    e.preventDefault();
    const title = els.bookTitle.value.trim();
    const author = els.bookAuthor.value.trim();
    const isbn = els.bookIsbn.value.trim();
    if (!title || !author || !isbn) return;

    if (addBook(title, author, isbn)) {
      save();
      renderAll();
      els.bookForm.reset();
    }
  });

  els.issueForm.addEventListener("submit", (e) => {
    if (!ensureAdmin()) return;
    e.preventDefault();
    const studentUid = els.issueStudent.value;
    const bookUid = els.issueBook.value;
    const issueDate = els.issueDate.value;
    const dueDate = els.dueDate.value;

    if (!studentUid || !bookUid || !issueDate || !dueDate) {
      alert("Please fill all issue form fields.");
      return;
    }

    if (issueBook(studentUid, bookUid, issueDate, dueDate)) {
      save();
      renderAll();
      els.issueForm.reset();
      els.issueDate.value = todayISO();
    }
  });

  els.activeLoansBody.addEventListener("click", (e) => {
    if (!ensureAdmin()) return;
    const btn = e.target.closest("button[data-return-id]");
    if (!btn) return;
    returnBook(btn.dataset.returnId);
    save();
    renderAll();
  });

  els.studentsManageBody.addEventListener("click", (e) => {
    if (!ensureAdmin()) return;
    const btn = e.target.closest("button[data-delete-student-id]");
    if (!btn) return;
    const ok = confirm("Delete this student? This cannot be undone.");
    if (!ok) return;

    if (deleteStudent(btn.dataset.deleteStudentId)) {
      save();
      renderAll();
    }
  });

  els.booksManageBody.addEventListener("click", (e) => {
    if (!ensureAdmin()) return;
    const btn = e.target.closest("button[data-delete-book-id]");
    if (!btn) return;
    const ok = confirm("Delete this book? This cannot be undone.");
    if (!ok) return;

    if (deleteBook(btn.dataset.deleteBookId)) {
      save();
      renderAll();
    }
  });

  els.panelActionBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!ensureAdmin()) return;
      showAdminOptionCard(btn.dataset.openTarget);
    });
  });

  els.activeSearch.addEventListener("input", renderActiveLoans);
  els.historySearch.addEventListener("input", renderHistory);
}

function bindAuthEvents() {
  els.roleChoiceBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      setAuthRole(btn.dataset.roleChoice);
    });
  });

  els.adminLoginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = els.adminUsername.value.trim();
    const password = els.adminPassword.value;

    if (loginAsAdmin(username, password)) {
      els.adminLoginForm.reset();
      renderAll();
    }
  });

  els.studentLoginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const loginId = els.studentLoginId.value.trim();
    if (!loginId) return;

    if (loginAsStudent(loginId)) {
      els.studentLoginForm.reset();
      renderAll();
    }
  });

  els.logoutBtn.addEventListener("click", () => {
    clearSession();
    renderAll();
  });
}

function seedIfEmpty() {
  if (state.students.length || state.books.length || state.loans.length) return;

  const s1 = { uid: uid("stu"), name: "Pranav Rao", studentId: "STU101" };
  const s2 = { uid: uid("stu"), name: "Meera Patel", studentId: "STU102" };
  const b1 = { uid: uid("bk"), title: "Operating System Concepts", author: "Silberschatz", isbn: "9781119456339" };
  const b2 = { uid: uid("bk"), title: "Computer Networks", author: "Tanenbaum", isbn: "9780132126953" };

  state.students.push(s1, s2);
  state.books.push(b1, b2);

  state.loans.push({
    uid: uid("loan"),
    studentUid: s1.uid,
    bookUid: b1.uid,
    issueDate: todayISO(),
    dueDate: todayISO(),
    returnDate: null
  });

  save();
}

function init() {
  load();
  loadSession();
  seedIfEmpty();
  bindEvents();
  bindAuthEvents();
  setAuthRole(null);
  showAdminOptionCard(null);
  els.issueDate.value = todayISO();
  renderAll();
}

init();