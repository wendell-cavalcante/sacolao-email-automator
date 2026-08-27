/* =========================================================
   SACOLÃO — Automatizador de e-mail
   Lógica: tema, seleção de loja, saudação automática,
   anexos e abertura do Gmail já preenchido.
   ========================================================= */

(() => {
  "use strict";

  /* ---------- ELEMENTOS ---------- */
  const html          = document.documentElement;
  const themeToggle    = document.getElementById("theme-toggle");
  const storeGrid      = document.getElementById("store-grid");
  const storeHint      = document.getElementById("store-hint");
  const toInput        = document.getElementById("to-input");
  const subjectInput   = document.getElementById("subject-input");
  const bodyInput      = document.getElementById("body-input");
  const dropzone       = document.getElementById("dropzone");
  const fileInput      = document.getElementById("file-input");
  const fileListEl     = document.getElementById("file-list");
  const sendButton     = document.getElementById("send-button");
  const toastEl        = document.getElementById("toast");

  let selectedStore = null;
  let attachedFiles = [];
  let toastTimer = null;

  /* ---------- TEMA (claro/escuro) ---------- */
  function applyTheme(theme){
    html.setAttribute("data-theme", theme);
    localStorage.setItem("sacolao-theme", theme);
  }

  function initTheme(){
    const saved = localStorage.getItem("sacolao-theme");
    if (saved) { applyTheme(saved); return; }
    const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    applyTheme(prefersLight ? "light" : "dark");
  }

  themeToggle.addEventListener("click", () => {
    const current = html.getAttribute("data-theme");
    applyTheme(current === "dark" ? "light" : "dark");
  });

  initTheme();

  /* ---------- SAUDAÇÃO AUTOMÁTICA ---------- */
  function getGreeting(){
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  }

  function buildDefaultBody(){
    return `Prezados, ${getGreeting().toLowerCase()}!\n\nSegue em anexo a(s) nota(s) e os custos.\n\nSem mais,\n\nAtenciosamente,`;
  }

  bodyInput.value = buildDefaultBody();

  /* ---------- SELEÇÃO DE LOJA ---------- */
  storeGrid.addEventListener("click", (e) => {
    const chip = e.target.closest(".store-chip");
    if (!chip) return;

    const store = chip.dataset.store;
    selectedStore = store;

    [...storeGrid.querySelectorAll(".store-chip")].forEach(c =>
      c.classList.toggle("is-active", c === chip)
    );

    const email = (typeof STORE_EMAILS !== "undefined" && STORE_EMAILS[store]) || "";
    const name  = (typeof STORE_NAMES !== "undefined" && STORE_NAMES[store]) || chip.querySelector(".chip-name").textContent;

    toInput.value = email;
    storeHint.textContent = email
      ? `Destinatário definido: ${name}.`
      : `Cadastre o e-mail da loja "${name}" em js/config.js.`;

    // sugestão de assunto só se o campo ainda estiver vazio
    if (!subjectInput.value.trim()){
      const today = new Date().toLocaleDateString("pt-BR");
      subjectInput.value = `Notas Fiscais ${today} — ${name}`;
    }

    validateForm();
  });

  /* ---------- ANEXOS ---------- */
  function formatSize(bytes){
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function renderFileList(){
    fileListEl.innerHTML = "";
    attachedFiles.forEach((file, index) => {
      const li = document.createElement("li");
      li.className = "file-item";
      li.innerHTML = `
        <svg class="file-icon" viewBox="0 0 24 24" fill="none">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
          <path d="M14 2v6h6" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
        </svg>
        <span class="file-name">${file.name}</span>
        <span class="file-size">${formatSize(file.size)}</span>
        <button type="button" class="file-remove" data-index="${index}" aria-label="Remover arquivo">✕</button>
      `;
      fileListEl.appendChild(li);
    });
  }

  function addFiles(fileArray){
    attachedFiles = attachedFiles.concat(fileArray);
    renderFileList();
  }

  fileListEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".file-remove");
    if (!btn) return;
    attachedFiles.splice(Number(btn.dataset.index), 1);
    renderFileList();
  });

  dropzone.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", () => {
    addFiles([...fileInput.files]);
    fileInput.value = "";
  });

  ["dragenter", "dragover"].forEach(evt =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add("is-dragover");
    })
  );

  ["dragleave", "drop"].forEach(evt =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove("is-dragover");
    })
  );

  dropzone.addEventListener("drop", (e) => {
    const files = [...(e.dataTransfer?.files || [])];
    if (files.length) addFiles(files);
  });

  /* ---------- VALIDAÇÃO ---------- */
  function validateForm(){
    const ok = Boolean(selectedStore) && toInput.value.trim() && subjectInput.value.trim();
    sendButton.disabled = !ok;
  }

  subjectInput.addEventListener("input", validateForm);

  /* ---------- TOAST ---------- */
  function showToast(message, isError = false){
    toastEl.textContent = message;
    toastEl.classList.toggle("is-error", isError);
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-visible"), 4200);
  }

  /* ---------- ENVIO (abre o Gmail já preenchido) ---------- */
  function buildGmailUrl(){
    const params = new URLSearchParams({
      view: "cm",
      fs: "1",
      to: toInput.value.trim(),
      su: subjectInput.value.trim(),
      body: bodyInput.value,
    });
    return `https://mail.google.com/mail/?${params.toString()}`;
  }

  sendButton.addEventListener("click", () => {
    if (sendButton.disabled) return;

    sendButton.classList.add("is-loading");

    setTimeout(() => {
      window.open(buildGmailUrl(), "_blank", "noopener");
      sendButton.classList.remove("is-loading");

      if (attachedFiles.length){
        showToast(`Gmail aberto! Arraste os ${attachedFiles.length} arquivo(s) selecionado(s) para dentro do e-mail — o navegador não permite anexar automaticamente por segurança.`);
      } else {
        showToast("Gmail aberto com o destinatário, assunto e mensagem preenchidos.");
      }
    }, 450);
  });

  /* ---------- INIT ---------- */
  validateForm();
})();
