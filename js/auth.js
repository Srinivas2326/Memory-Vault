// auth.js - register / login / logout (uses db.js helpers)

const SESSION_KEY = "mv_user";

async function registerUserUI(email, password) {
  if (!email || !password) throw "Provide email and password";
  const existing = await getUser(email);
  if (existing) throw "User already exists";
  await addUser({ email, password, createdAt: Date.now() });
  return "Account created";
}

async function loginUserUI(email, password) {
  if (!email || !password) throw "Provide email and password";
  const user = await getUser(email);
  if (!user || user.password !== password) throw "Invalid credentials";
  localStorage.setItem(SESSION_KEY, email);
  return "Logged in";
}

function getCurrentUser() {
  return localStorage.getItem(SESSION_KEY) || null;
}

function logoutUser() {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = "login.html";
}

/* UI wiring for login.html */
document.addEventListener("DOMContentLoaded", () => {
  const emailEl = document.getElementById("email");
  const passEl = document.getElementById("password");
  const msgEl = document.getElementById("message");
  const registerBtn = document.getElementById("registerBtn");
  const loginBtn = document.getElementById("loginBtn");

  function show(msg, type = "error") {
    if (!msgEl) return;
    msgEl.textContent = msg;
    msgEl.style.color = type === "success" ? "#5efc82" : "#ff6b6b";
  }

  if (registerBtn) {
    registerBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        const email = (emailEl.value || "").trim();
        const pass = (passEl.value || "").trim();
        if (!email || !pass) return show("Fill both fields");
        const r = await registerUserUI(email, pass);
        show(r, "success");
        setTimeout(() => (window.location.href = "upload.html"), 800);
      } catch (err) {
        show(String(err));
      }
    });
  }

  if (loginBtn) {
    loginBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        const email = (emailEl.value || "").trim();
        const pass = (passEl.value || "").trim();
        if (!email || !pass) return show("Fill both fields");
        const r = await loginUserUI(email, pass);
        show(r, "success");
        setTimeout(() => (window.location.href = "upload.html"), 600);
      } catch (err) {
        show(String(err));
      }
    });
  }
});
