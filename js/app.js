(() => {
  "use strict";

  /* ---------- ELEMENTOS ---------- */
  const html          = document.documentElement;
  const themeToggle   = document.getElementById("theme-toggle");
  const authButton    = document.getElementById("auth-button");
  const storeGrid     = document.getElementById("store-grid");
  const storeHint     = document.getElementById("store-hint");
  const toInput       = document.getElementById("to-input");
  const subjectInput  = document.getElementById("subject-input");
  const bodyInput     = document.getElementById("body-input");
  const dropzone      = document.getElementById("dropzone");
  const fileInput     = document.getElementById("file-input");
  const fileListEl    = document.getElementById("file-list");
  const sendButton    = document.getElementById("send-button");
  const toastEl       = document.getElementById("toast");

  let selectedStore = null;
  let attachedFiles = [];
  let toastTimer = null;
  let tokenClient = null;
  let accessToken = null;

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

  /* ---------- GOOGLE OAUTH2 (GIS) ---------- */
  function initGoogleAuth() {
    if (typeof google === "undefined" || !google.accounts) {
      setTimeout(initGoogleAuth, 300);
      return;
    }

    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: typeof GOOGLE_CLIENT_ID !== "undefined" ? GOOGLE_CLIENT_ID : "",
      scope: "https://www.googleapis.com/auth/gmail.send",
      callback: (tokenResponse) => {
        if (tokenResponse.error) {
          showToast("Erro na autenticação: " + tokenResponse.error, true);
          return;
        }
        accessToken = tokenResponse.access_token;
        authButton.textContent = "✓ Conectado";
        authButton.style.borderColor = "var(--leaf)";
        showToast("Conta Google conectada com sucesso!");
      },
    });
  }

  authButton.addEventListener("click", () => {
    if (!tokenClient) {
      showToast("Carregando autenticação do Google, aguarde...", true);
      return;
    }
    tokenClient.requestAccessToken({ prompt: "consent" });
  });

  window.addEventListener("load", initGoogleAuth);

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
    toastTimer = setTimeout(() => toastEl.classList.remove("is-visible"), 4500);
  }

  /* ---------- BUILD MIME & ENVIO VIA GMAIL API ---------- */
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = error => reject(error);
    });
  }

  async function buildRawEmail() {
    const boundary = "boundary_" + Math.random().toString(36).substring(2);
    const to = toInput.value.trim();
    const subject = subjectInput.value.trim();
    const body = bodyInput.value;

    let emailParts = [
      `To: ${to}`,
      `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: 8bit',
      '',
      body,
      ''
    ];

    for (const file of attachedFiles) {
      const base64Data = await fileToBase64(file);
      emailParts.push(
        `--${boundary}`,
        `Content-Type: ${file.type || 'application/octet-stream'}; name="${file.name}"`,
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename="${file.name}"`,
        '',
        base64Data,
        ''
      );
    }

    emailParts.push(`--${boundary}--`);

    const rawMessage = emailParts.join('\r\n');
    return btoa(unescape(encodeURIComponent(rawMessage)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  sendButton.addEventListener("click", async () => {
    if (sendButton.disabled) return;

    if (!accessToken) {
      showToast("Conecte sua conta Google primeiro clicando no botão acima.", true);
      if (tokenClient) tokenClient.requestAccessToken();
      return;
    }

    sendButton.classList.add("is-loading");
    sendButton.disabled = true;

    // Envia o e-mail via Gmail API

    try {

      alert("Deseja enviar o e-mail com " + attachedFiles.length + " anexo(s)?");

      if (!confirm("Deseja enviar o e-mail com " + attachedFiles.length + " anexo(s)?")) {
        showToast("Envio de e-mail cancelado pelo usuário.", true);
        return;
      }
      


      const raw = await buildRawEmail();

      const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ raw })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || "Falha ao enviar e-mail.");
      }

      showToast(`E-mail com ${attachedFiles.length} anexo(s) enviado com sucesso!`);
      
      // Limpa anexos após envio bem sucedido
      attachedFiles = [];
      renderFileList();
    } catch (error) {
      console.error(error);
      showToast(`Erro: ${error.message}`, true);
    } finally {
      sendButton.classList.remove("is-loading");
      validateForm();
    }
  });

  validateForm();
})();