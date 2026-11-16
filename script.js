// RetroXP 1.0 — стартовая оболочка сайта.
document.addEventListener("DOMContentLoaded", () => {
  const status = document.getElementById("status-text");
  if (status) {
    status.textContent = "Сайт загружен. Следующий шаг — подключить и протестировать эмулятор.";
  }
});
