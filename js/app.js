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

  const replyOpenButton   = document.getElementById("reply-open-button");
  const replyBanner       = document.getElementById("reply-banner");
  const replyBannerDetail = document.getElementById("reply-banner-detail");
  const replyCancelBtn    = document.getElementById("reply-cancel");

  const inboxOverlay = document.getElementById("inbox-overlay");
  const inboxClose   = document.getElementById("inbox-close");
  const inboxLoading = document.getElementById("inbox-loading");
  const inboxEmpty   = document.getElementById("inbox-empty");
  const inboxList    = document.getElementById("inbox-list");

  const navComposeButton = document.getElementById("nav-compose");
  const navInboxButton   = document.getElementById("nav-inbox");
  const navInboxBadge    = document.getElementById("nav-inbox-badge");
  const composeCard      = document.getElementById("compose-card");

  const inboxTabCard     = document.getElementById("inbox-tab-card");
  const inboxTabRefresh  = document.getElementById("inbox-tab-refresh");
  const inboxTabLoading  = document.getElementById("inbox-tab-loading");
  const inboxTabEmpty    = document.getElementById("inbox-tab-empty");
  const inboxTabList     = document.getElementById("inbox-tab-list");
  const inboxTabSubtitle = document.getElementById("inbox-tab-subtitle");

  // Elementos da leitura de e-mail
  const inboxListView        = document.getElementById("inbox-list-view");
  const inboxReadView        = document.getElementById("inbox-read-view");
  const inboxReadBack        = document.getElementById("inbox-read-back");
  const inboxReadReplyBtn    = document.getElementById("inbox-read-reply-btn");
  const readSubject          = document.getElementById("read-subject");
  const readFrom             = document.getElementById("read-from");
  const readDate             = document.getElementById("read-date");
  const readBody             = document.getElementById("read-body");
  const readAttachmentsWrap  = document.getElementById("read-attachments-wrap");
  const readAttachmentsList  = document.getElementById("read-attachments-list");

  const mailToast       = document.getElementById("mail-toast");
  const mailToastTitle  = document.getElementById("mail-toast-title");
  const mailToastDetail = document.getElementById("mail-toast-detail");

  const confirmOverlay  = document.getElementById("confirm-overlay");
  const confirmBox      = document.getElementById("confirm-box");
  const confirmTitle    = document.getElementById("confirm-title");
  const confirmMessage  = document.getElementById("confirm-message");
  const confirmFileList = document.getElementById("confirm-file-list");
  const confirmOkBtn    = document.getElementById("confirm-ok");
  const confirmCancelBtn= document.getElementById("confirm-cancel");

  const successToast     = document.getElementById("success-toast");
  const successToastText = document.getElementById("success-toast-text");

  let selectedStore = null;
  let attachedFiles = [];
  let toastTimer = null;
  let successToastTimer = null;
  let tokenClient = null;
  let accessToken = null;

  let mode = "compose";
  let replyContext = null;
  let onAuthSuccess = null;
  let readingMailContext = null;

  let currentView = "compose";
  let seenMessageIds = null;
  let mailPollTimer = null;
  let mailToastTimer = null;
  let isFetchingInboxTab = false;
  const MAIL_POLL_INTERVAL_MS = 45000;

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

  /* ---------- TRANSIÇÃO DE TELAS (Novo E-mail <-> Caixa de Entrada) ---------- */
  function showComposeView(){
    currentView = "compose";
    composeCard.hidden = false;
    composeCard.style.display = "flex";
    inboxTabCard.hidden = true;
    inboxTabCard.style.display = "none";

    navComposeButton.classList.add("is-active");
    navInboxButton.classList.remove("is-active");
  }

  function showInboxView(){
    currentView = "inbox";
    composeCard.hidden = true;
    composeCard.style.display = "none";
    inboxTabCard.hidden = false;
    inboxTabCard.style.display = "flex";

    // Mostra a lista e esconde o leitor ao entrar
    inboxListView.hidden = false;
    inboxReadView.hidden = true;

    navInboxButton.classList.add("is-active");
    navComposeButton.classList.remove("is-active");
    clearInboxBadge();
  }

  navComposeButton.addEventListener("click", () => {
    if (mode === "reply") {
      exitReplyMode();
    }
    showComposeView();
  });

  navInboxButton.addEventListener("click", async () => {
    showInboxView();
    const ok = await ensureAuth();
    if (!ok) return;
    fetchInboxTabList();
  });

  inboxTabRefresh.addEventListener("click", async () => {
    const ok = await ensureAuth();
    if (!ok) return;
    fetchInboxTabList();
  });

  function clearInboxBadge(){
    navInboxBadge.hidden = true;
    navInboxBadge.textContent = "0";
  }

  function bumpInboxBadge(count){
    if (currentView === "inbox") return;
    const current = Number(navInboxBadge.textContent || "0");
    const total = current + count;
    navInboxBadge.textContent = String(total);
    navInboxBadge.hidden = false;
  }

  /* ---------- GOOGLE OAUTH2 & SESSÃO ---------- */
  function setSessionToken(token, expiresInSeconds = 3500) {
    accessToken = token;
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    localStorage.setItem("sacolao_access_token", token);
    localStorage.setItem("sacolao_token_expires", expiresAt.toString());

    authButton.textContent = "✓ Conectado";
    authButton.style.borderColor = "var(--leaf)";
  }

  function clearSessionToken() {
    accessToken = null;
    localStorage.removeItem("sacolao_access_token");
    localStorage.removeItem("sacolao_token_expires");

    authButton.textContent = "Login";
    authButton.style.borderColor = "";
    stopMailPolling();
  }

  function restoreSession() {
    const savedToken = localStorage.getItem("sacolao_access_token");
    const expiresAt = Number(localStorage.getItem("sacolao_token_expires") || 0);

    if (savedToken && Date.now() < expiresAt - 60000) {
      accessToken = savedToken;
      authButton.textContent = "✓ Conectado";
      authButton.style.borderColor = "var(--leaf)";
      return true;
    }
    clearSessionToken();
    return false;
  }

  function initGoogleAuth() {
    if (typeof google === "undefined" || !google.accounts) {
      setTimeout(initGoogleAuth, 300);
      return;
    }

    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: typeof GOOGLE_CLIENT_ID !== "undefined" ? GOOGLE_CLIENT_ID : "",
      scope: "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly",
      callback: (tokenResponse) => {
        if (tokenResponse.error) {
          showToast("Erro na autenticação: " + tokenResponse.error, true);
          return;
        }
        setSessionToken(tokenResponse.access_token, tokenResponse.expires_in || 3599);
        showToast("Conta Google conectada!");
        startMailPolling();

        if (onAuthSuccess) {
          const cb = onAuthSuccess;
          onAuthSuccess = null;
          cb();
        }
      },
    });

    const restored = restoreSession();
    if (!restored && tokenClient) {
      try {
        tokenClient.requestAccessToken({ prompt: "none" });
      } catch (e) {}
    } else if (restored) {
      startMailPolling();
    }
  }

  authButton.addEventListener("click", () => {
    if (!tokenClient) {
      showToast("Carregando autenticação do Google, aguarde...", true);
      return;
    }
    tokenClient.requestAccessToken({ prompt: "consent" });
  });

  window.addEventListener("load", initGoogleAuth);

  function ensureAuth(){
    if (accessToken) return Promise.resolve(true);
    return new Promise((resolve) => {
      if (!tokenClient) {
        showToast("Carregando autenticação do Google, aguarde e tente de novo.", true);
        resolve(false);
        return;
      }
      onAuthSuccess = () => resolve(true);
      tokenClient.requestAccessToken({ prompt: "" });
    });
  }

  async function gmailApiFetch(url, options = {}){
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(options.headers || {}),
      },
    });

    if (response.status === 401){
      clearSessionToken();
      throw new Error("Sessão do Google expirada. Clique em Login e tente novamente.");
    }

    if (!response.ok){
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.error?.message || `Erro ${response.status} na Gmail API.`);
    }

    return response.json();
  }

  /* ---------- CORPO DO E-MAIL ---------- */
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

    validateForm();
  });

  /* ---------- FORMATAÇÃO E HELPERS ---------- */
  function formatEmailDate(internalDateMs, headerDateStr){
    const date = internalDateMs ? new Date(Number(internalDateMs)) : new Date(headerDateStr);
    if (isNaN(date.getTime())) return headerDateStr || "";
    return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function getHeader(headers, name){
    const h = (headers || []).find(h => h.name.toLowerCase() === name.toLowerCase());
    return h ? h.value : "";
  }

  function extractEmailAddress(fromHeader){
    const match = fromHeader.match(/<([^>]+)>/);
    return match ? match[1] : fromHeader.trim();
  }

  function extractDisplayName(fromHeader){
    const match = fromHeader.match(/^"?([^"<]+)"?\s*</);
    return match ? match[1].trim() : extractEmailAddress(fromHeader);
  }

  function buildFullMessageUrl(id){
    return `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`;
  }

  function decodeBase64Url(str) {
    if (!str) return "";
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) base64 += "=";
    try {
      return decodeURIComponent(escape(window.atob(base64)));
    } catch (e) {
      return window.atob(base64);
    }
  }

  function extractMessageBody(payload) {
    let textBody = "";
    let htmlBody = "";

    function walk(part) {
      if (!part) return;
      if (part.mimeType === "text/plain" && part.body && part.body.data) {
        textBody = decodeBase64Url(part.body.data);
      } else if (part.mimeType === "text/html" && part.body && part.body.data) {
        htmlBody = decodeBase64Url(part.body.data);
      }
      if (part.parts) {
        part.parts.forEach(walk);
      }
    }

    walk(payload);
    return textBody || htmlBody || "(E-mail sem conteúdo de texto)";
  }

  function extractAttachments(payload){
    const attachments = [];
    function walk(part){
      if (!part) return;
      if (part.filename && part.filename.trim()){
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType || "",
          size: (part.body && part.body.size) || 0,
          attachmentId: part.body && part.body.attachmentId,
          data: part.body && part.body.data
        });
      }
      (part.parts || []).forEach(walk);
    }
    walk(payload);
    return attachments;
  }

  function attachmentIconSvg(){
    return `<svg viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 2v6h6" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
  }

  /* ---------- BAIXAR / VISUALIZAR ANEXO ---------- */
  async function downloadAttachment(messageId, attachmentId, filename, mimeType) {
    try {
      showToast("Baixando anexo...");
      const res = await gmailApiFetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`
      );
      const base64Data = res.data.replace(/-/g, "+").replace(/_/g, "/");
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType || "application/octet-stream" });
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error(err);
      showToast(`Erro ao baixar anexo: ${err.message}`, true);
    }
  }

  /* ---------- CAIXA DE ENTRADA (LISTAGEM & LEITURA) ---------- */
  async function fetchInboxTabList(){
    if (isFetchingInboxTab) return;
    isFetchingInboxTab = true;

    inboxTabLoading.hidden = false;
    inboxTabEmpty.hidden = true;
    inboxTabRefresh.classList.add("is-spinning");

    try {
      const listData = await gmailApiFetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&labelIds=INBOX"
      );
      const refs = listData.messages || [];

      if (!refs.length){
        inboxTabList.innerHTML = "";
        inboxTabLoading.hidden = true;
        inboxTabEmpty.hidden = false;
        return;
      }

      const details = await Promise.all(
        refs.map(ref => gmailApiFetch(buildFullMessageUrl(ref.id)))
      );

      details.sort((a, b) => Number(b.internalDate) - Number(a.internalDate));

      if (seenMessageIds === null){
        seenMessageIds = new Set(details.map(d => d.id));
      } else {
        details.forEach(d => seenMessageIds.add(d.id));
      }

      renderInboxTabList(details);
      inboxTabSubtitle.textContent = `${details.length} e-mail(s) recebido(s) recentemente`;
    } catch (error){
      console.error(error);
      showToast(`Não foi possível carregar a caixa de entrada: ${error.message}`, true);
    } finally {
      inboxTabLoading.hidden = true;
      inboxTabRefresh.classList.remove("is-spinning");
      isFetchingInboxTab = false;
    }
  }

  function openMailReader(msg) {
    const headers    = msg.payload?.headers || [];
    const fromRaw    = getHeader(headers, "From");
    const subject    = getHeader(headers, "Subject") || "(sem assunto)";
    const messageId  = getHeader(headers, "Message-Id");
    const dateLabel  = formatEmailDate(msg.internalDate, getHeader(headers, "Date"));
    const fromName   = extractDisplayName(fromRaw);
    const fromEmail  = extractEmailAddress(fromRaw);
    const attachments = extractAttachments(msg.payload);
    const bodyContent = extractMessageBody(msg.payload);

    readingMailContext = {
      threadId: msg.threadId,
      messageId: messageId,
      to: fromEmail,
      fromName: fromName,
      subject: subject,
    };

    readSubject.textContent = subject;
    readFrom.textContent = `${fromName} <${fromEmail}>`;
    readDate.textContent = dateLabel;
    readBody.textContent = bodyContent;

    readAttachmentsList.innerHTML = "";
    if (attachments.length > 0) {
      readAttachmentsWrap.hidden = false;
      attachments.forEach(att => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "inbox-download-chip";
        btn.innerHTML = `${attachmentIconSvg()}<span>${att.filename}</span> (${formatSize(att.size)})`;
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (att.attachmentId) {
            downloadAttachment(msg.id, att.attachmentId, att.filename, att.mimeType);
          }
        });
        readAttachmentsList.appendChild(btn);
      });
    } else {
      readAttachmentsWrap.hidden = true;
    }

    inboxListView.hidden = true;
    inboxReadView.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  inboxReadBack.addEventListener("click", () => {
    inboxReadView.hidden = true;
    inboxListView.hidden = false;
  });

  inboxReadReplyBtn.addEventListener("click", () => {
    if (!readingMailContext) return;
    enterReplyMode(readingMailContext);
    showComposeView();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  function renderInboxTabList(messages){
    inboxTabList.innerHTML = "";

    messages.forEach(msg => {
      const headers    = msg.payload?.headers || [];
      const fromRaw    = getHeader(headers, "From");
      const subject    = getHeader(headers, "Subject") || "(sem assunto)";
      const messageId  = getHeader(headers, "Message-Id");
      const dateLabel  = formatEmailDate(msg.internalDate, getHeader(headers, "Date"));
      const fromName   = extractDisplayName(fromRaw);
      const fromEmail  = extractEmailAddress(fromRaw);
      const attachments = extractAttachments(msg.payload);

      const li = document.createElement("li");
      li.className = "inbox-tab-item";

      const attachmentsHtml = attachments.length
        ? `<div class="inbox-tab-attachments">${attachments.map(att => `
            <span class="inbox-attachment-chip" title="${att.filename}">
              ${attachmentIconSvg()}<span>${att.filename}</span>
            </span>`).join("")}</div>`
        : "";

      li.innerHTML = `
        <div class="inbox-tab-item-top">
          <span class="inbox-tab-item-from">${fromName}</span>
          <span class="inbox-tab-item-date">${dateLabel}</span>
        </div>
        <div class="inbox-tab-item-subject">${subject}</div>
        ${attachmentsHtml}
        <div class="inbox-tab-item-actions">
          <button type="button" class="inbox-tab-reply-button">
            <svg viewBox="0 0 24 24" fill="none"><path d="M9 14 4 9l5-5M4 9h9a6 6 0 0 1 6 6v3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Responder
          </button>
        </div>
      `;

      // Clicar no item abre a leitura do e-mail
      li.addEventListener("click", () => {
        openMailReader(msg);
      });

      // Clicar direto no botão responder
      li.querySelector(".inbox-tab-reply-button").addEventListener("click", (e) => {
        e.stopPropagation();
        enterReplyMode({
          threadId: msg.threadId,
          messageId: messageId,
          to: fromEmail,
          fromName: fromName,
          subject: subject,
        });
        showComposeView();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });

      inboxTabList.appendChild(li);
    });
  }

  /* ---------- MODAL DE RESPOSTA RÁPIDA ---------- */
  function openInboxModal(){
    inboxOverlay.classList.add("is-visible");
  }

  function closeInboxModal(){
    inboxOverlay.classList.remove("is-visible");
  }

  inboxClose.addEventListener("click", closeInboxModal);
  inboxOverlay.addEventListener("click", (e) => {
    if (e.target === inboxOverlay) closeInboxModal();
  });

  async function fetchInboxList(){
    inboxLoading.hidden = false;
    inboxEmpty.hidden = true;
    inboxList.innerHTML = "";

    try {
      const listData = await gmailApiFetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&labelIds=INBOX"
      );
      const refs = listData.messages || [];

      if (!refs.length){
        inboxLoading.hidden = true;
        inboxEmpty.hidden = false;
        return;
      }

      const details = await Promise.all(
        refs.map(ref => gmailApiFetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${ref.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date&metadataHeaders=Message-Id`))
      );

      details.sort((a, b) => Number(b.internalDate) - Number(a.internalDate));

      inboxList.innerHTML = "";
      details.forEach(msg => {
        const headers   = msg.payload?.headers || [];
        const fromRaw   = getHeader(headers, "From");
        const subject   = getHeader(headers, "Subject") || "(sem assunto)";
        const messageId = getHeader(headers, "Message-Id");
        const dateLabel = formatEmailDate(msg.internalDate, getHeader(headers, "Date"));
        const fromName  = extractDisplayName(fromRaw);
        const fromEmail = extractEmailAddress(fromRaw);

        const li = document.createElement("li");
        li.innerHTML = `
          <button type="button" class="inbox-item">
            <span class="inbox-item-top">
              <span class="inbox-item-from">${fromName}</span>
              <span class="inbox-item-date">${dateLabel}</span>
            </span>
            <span class="inbox-item-subject">${subject}</span>
          </button>
        `;

        li.querySelector(".inbox-item").addEventListener("click", async () => {
          enterReplyMode({
            threadId: msg.threadId,
            messageId: messageId,
            to: fromEmail,
            fromName: fromName,
            subject: subject,
          });
          closeInboxModal();
        });

        inboxList.appendChild(li);
      });
    } catch (error){
      console.error(error);
      showToast(`Não foi possível carregar a caixa de entrada: ${error.message}`, true);
      closeInboxModal();
    } finally {
      inboxLoading.hidden = true;
    }
  }

  replyOpenButton.addEventListener("click", async () => {
    const ok = await ensureAuth();
    if (!ok) return;
    openInboxModal();
    await fetchInboxList();
  });

  /* ---------- NOTIFICAÇÃO DE NOVO E-MAIL ---------- */
  function showMailToast(count, latest){
    if (count === 1 && latest){
      const headers = latest.payload?.headers || [];
      const fromName = extractDisplayName(getHeader(headers, "From"));
      const subject = getHeader(headers, "Subject") || "(sem assunto)";
      mailToastTitle.textContent = `Novo e-mail de ${fromName}`;
      mailToastDetail.textContent = subject;
    } else {
      mailToastTitle.textContent = "Novos e-mails recebidos";
      mailToastDetail.textContent = `${count} mensagens novas na caixa de entrada`;
    }

    mailToast.classList.add("is-visible");
    clearTimeout(mailToastTimer);
    mailToastTimer = setTimeout(() => mailToast.classList.remove("is-visible"), 7000);
  }

  mailToast.addEventListener("click", () => {
    mailToast.classList.remove("is-visible");
    showInboxView();
    fetchInboxTabList();
  });

  async function checkForNewMail(){
    if (!accessToken) return;
    try {
      const listData = await gmailApiFetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&labelIds=INBOX"
      );
      const refs = listData.messages || [];
      if (!refs.length) return;

      if (seenMessageIds === null){
        seenMessageIds = new Set(refs.map(r => r.id));
        return;
      }

      const newRefs = refs.filter(r => !seenMessageIds.has(r.id));
      if (!newRefs.length) return;

      newRefs.forEach(r => seenMessageIds.add(r.id));
      bumpInboxBadge(newRefs.length);

      let latestDetail = null;
      if (newRefs.length === 1){
        latestDetail = await gmailApiFetch(buildFullMessageUrl(newRefs[0].id));
      }
      showMailToast(newRefs.length, latestDetail);

      if (currentView === "inbox"){
        fetchInboxTabList();
      }
    } catch (error){
      console.warn("Falha ao verificar novos e-mails:", error.message);
    }
  }

  function startMailPolling(){
    stopMailPolling();
    checkForNewMail();
    mailPollTimer = setInterval(checkForNewMail, MAIL_POLL_INTERVAL_MS);
  }

  function stopMailPolling(){
    if (mailPollTimer){
      clearInterval(mailPollTimer);
      mailPollTimer = null;
    }
  }

  /* ---------- MODO RESPOSTA ---------- */
  function enterReplyMode(ctx){
    mode = "reply";
    replyContext = ctx;

    toInput.value = ctx.to;
    subjectInput.value = "";
    bodyInput.value = buildDefaultBody();

    replyBannerDetail.textContent = `Para ${ctx.fromName} — Conversa: ${ctx.subject}`;
    replyBanner.classList.add("is-visible");

    validateForm();
  }

  function exitReplyMode(){
    mode = "compose";
    replyContext = null;
    replyBanner.classList.remove("is-visible");

    selectedStore = null;
    [...storeGrid.querySelectorAll(".store-chip")].forEach(c => c.classList.remove("is-active"));

    toInput.value = "";
    subjectInput.value = "";
    storeHint.textContent = "Selecione a loja para preencher o destinatário automaticamente.";

    validateForm();
  }

  replyCancelBtn.addEventListener("click", exitReplyMode);

  /* ---------- CONFIRMAÇÃO MODAL ---------- */
  function showConfirm({ title, message, fileList = [], confirmText = "Sim", cancelText = "Cancelar", tone = "default" }){
    return new Promise((resolve) => {
      confirmTitle.textContent = title;
      confirmMessage.textContent = message;
      confirmOkBtn.textContent = confirmText;
      confirmCancelBtn.textContent = cancelText;
      confirmBox.classList.toggle("is-warning", tone === "warning");

      confirmFileList.innerHTML = "";
      if (fileList.length){
        fileList.forEach(name => {
          const chip = document.createElement("span");
          chip.className = "confirm-file-chip";
          chip.textContent = name;
          confirmFileList.appendChild(chip);
        });
        confirmFileList.style.display = "flex";
      } else {
        confirmFileList.style.display = "none";
      }

      confirmOverlay.classList.add("is-visible");

      function cleanup(result){
        confirmOverlay.classList.remove("is-visible");
        confirmOkBtn.removeEventListener("click", onOk);
        confirmCancelBtn.removeEventListener("click", onCancel);
        confirmOverlay.removeEventListener("click", onBackdrop);
        resolve(result);
      }
      function onOk(){ cleanup(true); }
      function onCancel(){ cleanup(false); }
      function onBackdrop(e){ if (e.target === confirmOverlay) cleanup(false); }

      confirmOkBtn.addEventListener("click", onOk);
      confirmCancelBtn.addEventListener("click", onCancel);
      confirmOverlay.addEventListener("click", onBackdrop);
    });
  }

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
    const ok = Boolean(toInput.value.trim() && subjectInput.value.trim());
    sendButton.disabled = !ok;
  }

  subjectInput.addEventListener("input", validateForm);
  toInput.addEventListener("input", validateForm);

  /* ---------- DETECTOR DE ANEXO ERRADO ---------- */
  function findMismatchedFiles(){
    if (!selectedStore) return [];
    const keywords = (typeof STORE_KEYWORDS !== "undefined" && STORE_KEYWORDS[selectedStore]) || [];
    if (!keywords.length) return [];

    return attachedFiles.filter(file => {
      const name = file.name.toLowerCase();
      return !keywords.some(keyword => name.includes(keyword.toLowerCase()));
    });
  }

  /* ---------- TOASTS ---------- */
  function showToast(message, isError = false){
    toastEl.textContent = message;
    toastEl.classList.toggle("is-error", isError);
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-visible"), 4500);
  }

  function showSuccessToast(message){
    successToastText.textContent = message;
    successToast.classList.add("is-visible");
    clearTimeout(successToastTimer);
    successToastTimer = setTimeout(() => successToast.classList.remove("is-visible"), 5000);
  }

  /* ---------- ENVIO VIA GMAIL API ---------- */
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
    ];

    if (mode === "reply" && replyContext?.messageId){
      emailParts.push(`In-Reply-To: ${replyContext.messageId}`);
      emailParts.push(`References: ${replyContext.messageId}`);
    }

    emailParts.push(
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: 8bit',
      '',
      body,
      ''
    );

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

    const ok = await ensureAuth();
    if (!ok) return;

    const mismatched = findMismatchedFiles();
    if (mismatched.length > 0){
      const storeLabel = (typeof STORE_NAMES !== "undefined" && STORE_NAMES[selectedStore]) || selectedStore;
      const proceedAnyway = await showConfirm({
        title: "Atenção aos Anexos!",
        message: `${mismatched.length} arquivo(s) não contêm o nome da loja "${storeLabel}". Deseja enviar assim mesmo?`,
        fileList: mismatched.map(f => f.name),
        confirmText: "Enviar mesmo assim",
        cancelText: "Revisar anexos",
        tone: "warning",
      });
      if (!proceedAnyway) return;
    }

    const confirmedSend = await showConfirm({
      title: mode === "reply" ? "Confirmar resposta" : "Confirmar envio",
      message: `Enviar este e-mail para ${toInput.value.trim()}?`,
      confirmText: "Enviar",
      cancelText: "Cancelar",
    });
    if (!confirmedSend) return;

    sendButton.classList.add("is-loading");
    sendButton.disabled = true;

    try {
      const raw = await buildRawEmail();
      const payload = { raw };
      if (mode === "reply" && replyContext?.threadId){
        payload.threadId = replyContext.threadId;
      }

      const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || "Falha ao enviar e-mail.");
      }

      showSuccessToast(
        attachedFiles.length
          ? `E-mail enviado com ${attachedFiles.length} anexo(s)!`
          : "E-mail enviado com sucesso!"
      );

      attachedFiles = [];
      renderFileList();
      if (mode === "reply") exitReplyMode();
      subjectInput.value = "";
      bodyInput.value = buildDefaultBody();
    } catch (error) {
      console.error(error);
      showToast(`Erro: ${error.message}`, true);
    } finally {
      sendButton.classList.remove("is-loading");
      validateForm();
    }
  });

  showComposeView();
  validateForm();
})();