// app.js - small helper: if on upload page but not logged in, redirect to login
document.addEventListener("DOMContentLoaded", () => {
  // If current page is upload.html and no session -> redirect
  const p = location.pathname.split("/").pop();
  if ((p === 'upload.html' || p === 'view.html') && !localStorage.getItem('mv_user')) {
    if (p === 'view.html') {
      // view.html can show missing message, but redirect to login for simplicity:
      // allow view.html to attempt reading DB (no redirect) — we won't force redirect here.
    } else {
      window.location.href = 'login.html';
    }
  }
});
