(() => {
  "use strict";

  /* ---------- ELEMENTOS ---------- */
  const html          = document.documentElement;
  const themeToggle   = document.getElementById("theme-toggle");
  const authButton    = document.getElementById("auth-button");
  const storeGrid     = document.getElementById("store-grid");
  const storeHint     = document.getElementById("store-hint");
  
  // Destinatários
  const recipientsContainer = document.getElementById("recipients-container");
  const recipientsChipsEl   = document.getElementById("recipients-chips");
  const toTextInput         = document.getElementById("to-text-input");
  const toInput             = document.getElementById("to-input");
  
  // Campos do formulário
  const subjectInput  = document.getElementById("subject-input");
  const bodyInput     = document.getElementById("body-input");
  const dropzone      = document.getElementById("dropzone");
  const fileInput     = document.getElementById("file-input");
  const fileListEl    = document.getElementById("file-list");
  const sendButton    = document.getElementById("send-button");
  const toastEl       = document.getElementById("toast");

  // Banner e botões de resposta
  const replyOpenButton   = document.getElementById("reply-open-button");
  const replyBanner       = document.getElementById("reply-banner");
  const replyBannerDetail = document.getElementById("reply-banner-detail");
  const replyCancelBtn    = document.getElementById("reply-cancel");

  // Modais e navegação
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

  const subnavInboxBtn    = document.getElementById("subnav-inbox-btn");
  const subnavSentBtn     = document.getElementById("subnav-sent-btn");
  const subnavDraftsBtn   = document.getElementById("subnav-drafts-btn");
  const draftsCountBadge  = document.getElementById("drafts-count-badge");

  // Leitor
  const inboxListView        = document.getElementById("inbox-list-view");
  const inboxReadView        = document.getElementById("inbox-read-view");
  const inboxReadBack        = document.getElementById("inbox-read-back");
  const inboxReadReplyBtn    = document.getElementById("inbox-read-reply-btn");
  const inboxReadUnreadBtn   = document.getElementById("inbox-read-unread-btn");
  const readSubject          = document.getElementById("read-subject");
  const readFromLabel        = document.getElementById("read-from-label");
  const readFrom              = document.getElementById("read-from");
  const readDate             = document.getElementById("read-date");
  const readBody             = document.getElementById("read-body");
  const readAttachmentsWrap  = document.getElementById("read-attachments-wrap");
  const readAttachmentsList  = document.getElementById("read-attachments-list");

  // Modal do Visualizador estilo Google Drive
  const attachmentModal       = document.getElementById("attachment-modal");
  const attViewerClose        = document.getElementById("att-viewer-close");
  const attViewerIcon         = document.getElementById("att-viewer-icon");
  const attViewerFilename     = document.getElementById("att-viewer-filename");
  const attViewerOpenwith     = document.getElementById("att-viewer-openwith");
  const attViewerOpenwithText = document.getElementById("att-viewer-openwith-text");
  const attViewerDrive        = document.getElementById("att-viewer-drive");
  const attViewerPrint        = document.getElementById("att-viewer-print");
  const attViewerDownload     = document.getElementById("att-viewer-download");
  const attViewerLoading      = document.getElementById("att-viewer-loading");
  const attViewerContent      = document.getElementById("att-viewer-content");

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

  const undoToast        = document.getElementById("undo-toast");
  const undoTimerEl      = document.getElementById("undo-timer");
  const undoSendBtn      = document.getElementById("undo-send-btn");

  let selectedStore = null;
  let recipientEmails = [];
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
  let currentInboxSubTab = "inbox";
  let cachedInboxMessages = [];
  let cachedSentMessages = [];

  let sessionRefreshTimer = null;
  const driveFileCache = new Map();
  let activeViewerCacheKey = null;

  let seenMessageIds = null;
  let mailPollTimer = null;
  let mailToastTimer = null;
  let isFetchingInboxTab = false;
  const MAIL_POLL_INTERVAL_MS = 45000;

  let pendingEmailPayload = null;
  let undoCountdownTimer = null;
  let undoSecondsRemaining = 10;

  let currentGmailDraftId = null;
  let autoSaveDraftTimeout = null;
  let isSavingDraft = false;

  let activeViewerBlob = null;
  let activeViewerBlobUrl = null;
  let activeViewerFilename = "";

  /* ---------- TEMA ---------- */
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

  /* ---------- GERENCIAMENTO DE DESTINATÁRIOS ---------- */
  function renderRecipients() {
    if (!recipientsChipsEl) return;
    recipientsChipsEl.innerHTML = "";
    recipientEmails.forEach((email, index) => {
      const chip = document.createElement("span");
      chip.className = "recipient-chip";
      chip.innerHTML = `
        <button type="button" class="recipient-chip-remove" data-index="${index}" title="Remover e-mail">✕</button>
        <span class="recipient-chip-text">${email}</span>
      `;
      recipientsChipsEl.appendChild(chip);
    });

    if (toInput) toInput.value = recipientEmails.join(", ");
    validateForm();
  }

  function addRecipient(rawEmail) {
    if (!rawEmail) return;
    const cleaned = String(rawEmail).trim().replace(/^,+|,+$/g, "");
    if (!cleaned) return;

    const splitted = cleaned.split(/[\s,;]+/);
    splitted.forEach(email => {
      const trimmed = email.trim();
      if (trimmed && !recipientEmails.includes(trimmed)) {
        recipientEmails.push(trimmed);
      }
    });

    renderRecipients();
    scheduleAutoSaveDraft();
  }

  function removeRecipient(index) {
    recipientEmails.splice(index, 1);
    renderRecipients();
    scheduleAutoSaveDraft();
  }

  if (recipientsContainer) {
    recipientsContainer.addEventListener("click", (e) => {
      const btn = e.target.closest(".recipient-chip-remove");
      if (btn) {
        removeRecipient(Number(btn.dataset.index));
        return;
      }
      if (toTextInput) toTextInput.focus();
    });
  }

  if (toTextInput) {
    toTextInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === "," || e.key === ";") {
        e.preventDefault();
        if (toTextInput.value.trim()) {
          addRecipient(toTextInput.value);
          toTextInput.value = "";
        }
      } else if (e.key === "Backspace" && !toTextInput.value && recipientEmails.length > 0) {
        removeRecipient(recipientEmails.length - 1);
      }
    });

    toTextInput.addEventListener("blur", () => {
      if (toTextInput.value.trim()) {
        addRecipient(toTextInput.value);
        toTextInput.value = "";
      }
    });

    toTextInput.addEventListener("paste", (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData("text");
      if (text) {
        addRecipient(text);
        toTextInput.value = "";
      }
    });
  }

  /* ---------- TRANSIÇÃO DE TELAS ---------- */
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
    if (mode !== "reply") {
      syncCurrentDraftToGmail();
    }

    currentView = "inbox";
    composeCard.hidden = true;
    composeCard.style.display = "none";
    inboxTabCard.hidden = false;
    inboxTabCard.style.display = "flex";

    inboxListView.hidden = false;
    inboxReadView.hidden = true;

    navInboxButton.classList.add("is-active");
    navComposeButton.classList.remove("is-active");
    clearInboxBadge();
  }

  navComposeButton.addEventListener("click", () => {
    showComposeView();
  });

  navInboxButton.addEventListener("click", async () => {
    showInboxView();
    const ok = await ensureAuth();
    if (!ok) return;
    if (currentInboxSubTab === "drafts") {
      fetchDraftsTabList();
    } else if (currentInboxSubTab === "sent") {
      fetchSentTabList();
    } else {
      fetchInboxTabList();
    }
  });

  inboxTabRefresh.addEventListener("click", async () => {
    const ok = await ensureAuth();
    if (!ok) return;
    if (currentInboxSubTab === "drafts") {
      fetchDraftsTabList();
    } else if (currentInboxSubTab === "sent") {
      fetchSentTabList();
    } else {
      fetchInboxTabList();
    }
  });

  subnavInboxBtn.addEventListener("click", async () => {
    currentInboxSubTab = "inbox";
    subnavInboxBtn.classList.add("is-active");
    subnavSentBtn.classList.remove("is-active");
    subnavDraftsBtn.classList.remove("is-active");
    
    if (cachedInboxMessages.length > 0) {
      renderInboxTabList(cachedInboxMessages, "inbox");
      inboxTabSubtitle.textContent = `${cachedInboxMessages.length} e-mail(s) recebido(s) recentemente`;
    } else {
      const ok = await ensureAuth();
      if (ok) fetchInboxTabList();
    }
  });

  subnavSentBtn.addEventListener("click", async () => {
    currentInboxSubTab = "sent";
    subnavSentBtn.classList.add("is-active");
    subnavInboxBtn.classList.remove("is-active");
    subnavDraftsBtn.classList.remove("is-active");

    if (cachedSentMessages.length > 0) {
      renderInboxTabList(cachedSentMessages, "sent");
      inboxTabSubtitle.textContent = `${cachedSentMessages.length} e-mail(s) enviado(s) recentemente`;
    } else {
      const ok = await ensureAuth();
      if (ok) fetchSentTabList();
    }
  });

  subnavDraftsBtn.addEventListener("click", async () => {
    currentInboxSubTab = "drafts";
    subnavDraftsBtn.classList.add("is-active");
    subnavInboxBtn.classList.remove("is-active");
    subnavSentBtn.classList.remove("is-active");
    const ok = await ensureAuth();
    if (ok) fetchDraftsTabList();
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
  // Mantém a sessão viva enquanto a aba estiver aberta, renovando o token
  // silenciosamente (sem popup) um pouco antes dele expirar.
  function scheduleSilentRefresh(expiresInSeconds){
    if (sessionRefreshTimer) {
      clearTimeout(sessionRefreshTimer);
      sessionRefreshTimer = null;
    }
    const safeExpiry = Number(expiresInSeconds) || 3500;
    // Renova 5 minutos antes de expirar (nunca menos que 1 minuto de espera)
    const refreshInMs = Math.max((safeExpiry - 300) * 1000, 60000);
    sessionRefreshTimer = setTimeout(() => {
      if (tokenClient) {
        try { tokenClient.requestAccessToken({ prompt: "none" }); } catch (e) {}
      }
    }, refreshInMs);
  }

  function setSessionToken(token, expiresInSeconds = 3500) {
    accessToken = token;
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    localStorage.setItem("sacolao_access_token", token);
    localStorage.setItem("sacolao_token_expires", expiresAt.toString());

    authButton.textContent = "✓ Conectado";
    authButton.style.borderColor = "var(--leaf)";

    scheduleSilentRefresh(expiresInSeconds);
  }

  function clearSessionToken() {
    accessToken = null;
    localStorage.removeItem("sacolao_access_token");
    localStorage.removeItem("sacolao_token_expires");

    authButton.textContent = "Login";
    authButton.style.borderColor = "";
    stopMailPolling();

    if (sessionRefreshTimer) {
      clearTimeout(sessionRefreshTimer);
      sessionRefreshTimer = null;
    }
  }

  function restoreSession() {
    const savedToken = localStorage.getItem("sacolao_access_token");
    const expiresAt = Number(localStorage.getItem("sacolao_token_expires") || 0);

    if (savedToken && Date.now() < expiresAt - 60000) {
      accessToken = savedToken;
      authButton.textContent = "✓ Conectado";
      authButton.style.borderColor = "var(--leaf)";
      scheduleSilentRefresh((expiresAt - Date.now()) / 1000);
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
      scope: "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/drive.file",
      callback: (tokenResponse) => {
        if (tokenResponse.error) {
          // Falha silenciosa (ex.: prompt "none" sem sessão do Google ativa) não deve incomodar o usuário
          if (tokenResponse.error !== "immediate_failed" && tokenResponse.error !== "access_denied") {
            showToast("Erro na autenticação: " + tokenResponse.error, true);
          }
          return;
        }
        const wasConnected = !!accessToken;
        setSessionToken(tokenResponse.access_token, tokenResponse.expires_in || 3599);
        if (!wasConnected) showToast("Conta Google conectada!");
        startMailPolling();
        updateDraftsBadge();

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
      updateDraftsBadge();
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

  // Ao voltar para a aba, garante que a sessão ainda está válida (ou renova
  // silenciosamente), para que o usuário nunca precise clicar em Login de novo
  // enquanto continuar logado na conta Google do navegador.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible" || !tokenClient) return;
    const expiresAt = Number(localStorage.getItem("sacolao_token_expires") || 0);
    if (!accessToken || Date.now() > expiresAt - 120000) {
      try { tokenClient.requestAccessToken({ prompt: "none" }); } catch (e) {}
    }
  });

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

  function ensureDriveScope(){
    return new Promise((resolve) => {
      if (!tokenClient) { resolve(false); return; }
      onAuthSuccess = () => resolve(true);
      tokenClient.requestAccessToken({ prompt: "consent" });
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

    return response.status === 204 ? null : response.json();
  }

  /* ---------- LIDO / NÃO LIDO ---------- */
  async function setMessageReadState(gmailId, isUnread){
    try {
      const bodyPayload = isUnread 
        ? { addLabelIds: ["UNREAD"] } 
        : { removeLabelIds: ["UNREAD"] };

      await gmailApiFetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${gmailId}/modify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyPayload),
        }
      );
      return true;
    } catch (error){
      console.error("Falha ao atualizar status no Gmail:", error);
      return false;
    }
  }

  function setListItemUnreadState(gmailId, isUnread){
    const li = inboxTabList.querySelector(`[data-msg-id="${gmailId}"]`);
    if (!li) return;
    li.classList.toggle("is-unread", isUnread);
    const fromEl = li.querySelector(".inbox-tab-item-from");
    if (!fromEl) return;
    const existingDot = fromEl.querySelector(".unread-dot");
    if (isUnread && !existingDot){
      fromEl.insertAdjacentHTML("afterbegin", '<span class="unread-dot" aria-hidden="true"></span>');
    } else if (!isUnread && existingDot){
      existingDot.remove();
    }
  }

  function updateUnreadToggleButton(isUnread){
    inboxReadUnreadBtn.classList.toggle("is-unread-state", isUnread);
    inboxReadUnreadBtn.title = isUnread ? "Marcar como lido" : "Marcar como não lido";
    inboxReadUnreadBtn.innerHTML = isUnread
      ? `<svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Marcar como lido`
      : `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2" fill="currentColor"/></svg> Marcar não lido`;
  }

  inboxReadUnreadBtn.addEventListener("click", async () => {
    if (!readingMailContext) return;
    const targetUnreadState = !readingMailContext.isUnread;

    inboxReadUnreadBtn.disabled = true;
    const ok = await setMessageReadState(readingMailContext.gmailId, targetUnreadState);
    inboxReadUnreadBtn.disabled = false;
    
    if (!ok) return;

    readingMailContext.isUnread = targetUnreadState;
    if (readingMailContext.rawMsg) {
      if (!readingMailContext.rawMsg.labelIds) {
        readingMailContext.rawMsg.labelIds = [];
      }
      if (targetUnreadState) {
        if (!readingMailContext.rawMsg.labelIds.includes("UNREAD")) {
          readingMailContext.rawMsg.labelIds.push("UNREAD");
        }
      } else {
        readingMailContext.rawMsg.labelIds = readingMailContext.rawMsg.labelIds.filter(l => l !== "UNREAD");
      }
    }

    updateUnreadToggleButton(targetUnreadState);
    setListItemUnreadState(readingMailContext.gmailId, targetUnreadState);
    showToast(targetUnreadState ? "E-mail marcado como não lido." : "E-mail marcado como lido.");
  });

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

  /* ---------- RASCUNHOS DIRETAMENTE NO GMAIL API ---------- */
  function isFormDirty(){
    const sub = subjectInput ? subjectInput.value.trim() : "";
    const body = bodyInput ? bodyInput.value.trim() : "";
    const defBody = buildDefaultBody().trim();

    return Boolean(recipientEmails.length > 0 || sub || (body && body !== defBody) || attachedFiles.length > 0);
  }

  async function updateDraftsBadge(){
    if (!accessToken) return;
    try {
      const data = await gmailApiFetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts?maxResults=10");
      const count = (data.drafts || []).length;
      if (count > 0){
        draftsCountBadge.textContent = String(count);
        draftsCountBadge.hidden = false;
      } else {
        draftsCountBadge.hidden = true;
      }
    } catch (e){}
  }

  async function syncCurrentDraftToGmail(){
    if (!accessToken || isSavingDraft || mode === "reply") return;
    if (!isFormDirty()) return;

    isSavingDraft = true;
    try {
      const raw = await buildRawEmail({
        to: recipientEmails.join(", "),
        subject: subjectInput.value.trim(),
        body: bodyInput.value,
        files: attachedFiles,
        mode: mode,
        replyContext: replyContext
      });

      const messageObj = { raw };
      if (mode === "reply" && replyContext?.threadId){
        messageObj.threadId = replyContext.threadId;
      }

      if (currentGmailDraftId){
        await gmailApiFetch(`https://gmail.googleapis.com/gmail/v1/users/me/drafts/${currentGmailDraftId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: messageObj })
        });
      } else {
        const created = await gmailApiFetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: messageObj })
        });
        if (created && created.id){
          currentGmailDraftId = created.id;
        }
      }
      updateDraftsBadge();
    } catch (err){
      console.warn("Falha ao sincronizar rascunho no Gmail:", err.message);
    } finally {
      isSavingDraft = false;
    }
  }

  async function deleteGmailDraft(draftId){
    if (!accessToken) return;
    try {
      await gmailApiFetch(`https://gmail.googleapis.com/gmail/v1/users/me/drafts/${draftId}`, {
        method: "DELETE"
      });
      if (currentGmailDraftId === draftId){
        currentGmailDraftId = null;
      }
      updateDraftsBadge();
      if (currentInboxSubTab === "drafts"){
        fetchDraftsTabList();
      }
      showToast("Rascunho descartado.");
    } catch (e){
      showToast(`Erro ao excluir rascunho: ${e.message}`, true);
    }
  }

  function scheduleAutoSaveDraft(){
    if (mode === "reply") return;
    clearTimeout(autoSaveDraftTimeout);
    autoSaveDraftTimeout = setTimeout(() => {
      syncCurrentDraftToGmail();
    }, 2000);
  }

  async function fetchDraftsTabList(){
    if (!accessToken) return;
    inboxTabLoading.hidden = false;
    inboxTabEmpty.hidden = true;
    inboxTabRefresh.classList.add("is-spinning");

    try {
      const data = await gmailApiFetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts?maxResults=20");
      const drafts = data.drafts || [];

      if (!drafts.length){
        inboxTabList.innerHTML = "";
        inboxTabLoading.hidden = true;
        inboxTabEmpty.textContent = "Nenhum e-mail encontrado em Rascunhos.";
        inboxTabEmpty.hidden = false;
        inboxTabSubtitle.textContent = "0 rascunho(s)";
        draftsCountBadge.hidden = true;
        return;
      }

      const draftDetails = await Promise.all(
        drafts.map(d => gmailApiFetch(`https://gmail.googleapis.com/gmail/v1/users/me/drafts/${d.id}?format=full`))
      );

      draftDetails.sort((a, b) => Number(b.message.internalDate) - Number(a.message.internalDate));
      draftsCountBadge.textContent = String(draftDetails.length);
      draftsCountBadge.hidden = false;
      renderDraftsTabList(draftDetails);
    } catch (err){
      console.error(err);
      showToast(`Erro ao carregar rascunhos: ${err.message}`, true);
    } finally {
      inboxTabLoading.hidden = true;
      inboxTabRefresh.classList.remove("is-spinning");
    }
  }

  function loadGmailDraftIntoForm(draft){
    currentGmailDraftId = draft.id;
    const msg = draft.message;
    const headers = msg?.payload?.headers || [];
    
    const toRaw = getHeader(headers, "To") || "";
    recipientEmails = [];
    if (toRaw) {
      addRecipient(toRaw);
    } else {
      renderRecipients();
    }

    subjectInput.value = getHeader(headers, "Subject") || "";
    bodyInput.value = extractMessageBody(msg?.payload) || buildDefaultBody();
    
    selectedStore = null;
    if (typeof STORE_EMAILS !== "undefined") {
      const currentToStr = recipientEmails.join(", ").toLowerCase();
      for (const [key, emails] of Object.entries(STORE_EMAILS)) {
        if (emails.toLowerCase().split(",").some(e => currentToStr.includes(e.trim().toLowerCase()))) {
          selectedStore = key;
          break;
        }
      }
    }

    [...storeGrid.querySelectorAll(".store-chip")].forEach(c =>
      c.classList.toggle("is-active", c.dataset.store === selectedStore)
    );

    showComposeView();
    validateForm();
    showToast("Rascunho aberto para edição.");
  }

  function renderDraftsTabList(drafts){
    inboxTabList.innerHTML = "";
    inboxTabSubtitle.textContent = `${drafts.length} rascunho(s) no Gmail`;

    drafts.forEach(draft => {
      const msg = draft.message;
      const headers = msg?.payload?.headers || [];
      const toVal = getHeader(headers, "To") || "(Sem destinatário)";
      const subject = getHeader(headers, "Subject") || "(Rascunho sem assunto)";
      const dateLabel = formatEmailDate(msg.internalDate, getHeader(headers, "Date"));
      const attachments = extractAttachments(msg.payload);

      const li = document.createElement("li");
      li.className = "inbox-tab-item";

      const filesLabel = attachments.length > 0 
        ? `<div class="inbox-tab-attachments"><span class="inbox-attachment-chip">${attachmentIconSvg()}<span>${attachments.length} anexo(s)</span></span></div>`
        : "";

      li.innerHTML = `
        <div class="inbox-tab-item-top">
          <span class="inbox-tab-item-from"><span class="draft-tag">Rascunho</span>${toVal}</span>
          <span class="inbox-tab-item-date">${dateLabel}</span>
        </div>
        <div class="inbox-tab-item-subject">${subject}</div>
        ${filesLabel}
        <div class="inbox-tab-item-actions">
          <button type="button" class="btn-draft-delete" data-draft-id="${draft.id}">Descartar</button>
          <button type="button" class="inbox-tab-reply-button">Editar</button>
        </div>
      `;

      li.addEventListener("click", () => {
        loadGmailDraftIntoForm(draft);
      });

      li.querySelector(".btn-draft-delete").addEventListener("click", (e) => {
        e.stopPropagation();
        deleteGmailDraft(draft.id);
      });

      li.querySelector(".inbox-tab-reply-button").addEventListener("click", (e) => {
        e.stopPropagation();
        loadGmailDraftIntoForm(draft);
      });

      inboxTabList.appendChild(li);
    });
  }

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

    recipientEmails = [];
    if (email) {
      addRecipient(email);
    } else {
      renderRecipients();
    }

    storeHint.textContent = email
      ? `Destinatários da loja ${name} adicionados.`
      : `Cadastre o e-mail da loja "${name}" em js/config.js.`;

    validateForm();
    scheduleAutoSaveDraft();
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
    if (!fromHeader) return "";
    const match = fromHeader.match(/<([^>]+)>/);
    return match ? match[1] : fromHeader.trim();
  }

  function extractDisplayName(fromHeader){
    if (!fromHeader) return "";
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
    return textBody || htmlBody || "";
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
          partId: part.partId || "0.1",
          data: part.body && part.body.data
        });
      }
      (part.parts || []).forEach(walk);
    }
    walk(payload);
    return attachments;
  }

  function getFileIconSvg(filename = "") {
    const ext = filename.split(".").pop().toLowerCase();
    if (["xlsx", "xls", "csv"].includes(ext)) {
      return `<svg viewBox="0 0 24 24" fill="#107c41"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"/><path d="M14 2v6h6" fill="#0b552c"/><path d="m9.5 13 2 3.5 2-3.5h1.5l-2.7 4.5 2.8 4.5H13.6L11.5 18l-2.1 4H8l2.8-4.5L8 13h1.5Z" fill="#fff"/></svg>`;
    }
    if (ext === "pdf") {
      return `<svg viewBox="0 0 24 24" fill="#ea4335"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"/><path d="M14 2v6h6" fill="#b31412"/><path d="M9 13h2a1.5 1.5 0 0 1 0 3H9v-3Z" fill="#fff"/></svg>`;
    }
    return `<svg viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 2v6h6" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
  }

  function attachmentIconSvg(){
    return `<svg viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 2v6h6" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
  }

  /* ---------- VISUALIZADOR INTERNO ESTILO GOOGLE DRIVE ---------- */
  async function fetchAttachmentBlob(messageId, attachmentId, mimeType) {
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
    return new Blob([byteArray], { type: mimeType || "application/octet-stream" });
  }

  function triggerFileDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ---------- ENVIO DE ANEXOS PARA O GOOGLE DRIVE (VISUALIZAÇÃO/IMPRESSÃO NATIVA) ---------- */
  function blobToBase64(blob){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function uploadAttachmentToDrive(blob, filename, mimeType, allowRetry = true) {
    const metadata = { name: filename, mimeType: mimeType || "application/octet-stream" };
    const boundary = "sacolao_drive_" + Math.random().toString(36).slice(2);
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelim = `\r\n--${boundary}--`;
    const base64Data = await blobToBase64(blob);

    const multipartBody =
      delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${metadata.mimeType}\r\n` +
      "Content-Transfer-Encoding: base64\r\n\r\n" +
      base64Data +
      closeDelim;

    const response = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary="${boundary}"`,
        },
        body: multipartBody,
      }
    );

    if ((response.status === 401 || response.status === 403) && allowRetry) {
      const reAuthed = await ensureDriveScope();
      if (reAuthed) return uploadAttachmentToDrive(blob, filename, mimeType, false);
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || "Falha ao enviar o arquivo para o Google Drive.");
    }

    return response.json();
  }

  async function getOrUploadDriveFile(){
    if (!activeViewerBlob || !activeViewerCacheKey) return null;
    let fileInfo = driveFileCache.get(activeViewerCacheKey);
    if (fileInfo) return fileInfo;
    fileInfo = await uploadAttachmentToDrive(activeViewerBlob, activeViewerFilename, activeViewerBlob.type);
    driveFileCache.set(activeViewerCacheKey, fileInfo);
    return fileInfo;
  }

  /* ---------- IMPRESSÃO MODERNA (TELA NATIVA DO NAVEGADOR COM PREVIEW) ---------- */
  function printHtmlContent(title, htmlContent) {
    const existingFrame = document.getElementById("print-iframe");
    if (existingFrame) existingFrame.remove();

    const iframe = document.createElement("iframe");
    iframe.id = "print-iframe";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${title}</title>
          <style>
            @page {
              size: auto;
              margin: 12mm 15mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              color: #000;
              margin: 0;
              padding: 0;
              background: #fff;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              font-size: 11px;
            }
            th, td {
              border: 1px solid #777;
              padding: 5px 8px;
              text-align: left;
            }
            th {
              background-color: #e8eaed !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              font-weight: 700;
            }
            .row-num {
              width: 32px;
              text-align: center;
              background-color: #f1f3f4 !important;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `);
    doc.close();

    iframe.contentWindow.focus();
    setTimeout(() => {
      iframe.contentWindow.print();
      setTimeout(() => iframe.remove(), 2000);
    }, 250);
  }

  async function openAttachmentViewer(messageId, attachmentId, filename, mimeType) {
    attachmentModal.hidden = false;
    attViewerLoading.hidden = false;
    attViewerContent.innerHTML = "";
    attViewerFilename.textContent = filename;
    attViewerIcon.innerHTML = getFileIconSvg(filename);
    activeViewerFilename = filename;
    activeViewerCacheKey = `${messageId}:${attachmentId}`;

    const ext = filename.split(".").pop().toLowerCase();

    if (["xlsx", "xls", "csv"].includes(ext)) {
      attViewerOpenwithText.textContent = "Abrir com Planilhas Google";
    } else if (ext === "pdf" || ["doc", "docx"].includes(ext)) {
      attViewerOpenwithText.textContent = "Abrir com Documentos Google";
    } else {
      attViewerOpenwithText.textContent = "Abrir com Google Drive";
    }

    try {
      const blob = await fetchAttachmentBlob(messageId, attachmentId, mimeType);
      activeViewerBlob = blob;
      if (activeViewerBlobUrl) URL.revokeObjectURL(activeViewerBlobUrl);
      activeViewerBlobUrl = URL.createObjectURL(blob);

      attViewerLoading.hidden = true;

      if (mimeType.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) {
        const img = document.createElement("img");
        img.src = activeViewerBlobUrl;
        img.alt = filename;
        img.className = "drive-preview-image";
        attViewerContent.appendChild(img);
      } else if (mimeType === "application/pdf" || ext === "pdf") {
        const pdfViewer = document.createElement("object");
        pdfViewer.data = `${activeViewerBlobUrl}#toolbar=0&navpanes=0&scrollbar=1`;
        pdfViewer.type = "application/pdf";
        pdfViewer.className = "drive-preview-pdf";
        pdfViewer.innerHTML = `<iframe src="${activeViewerBlobUrl}" class="drive-preview-pdf"></iframe>`;
        attViewerContent.appendChild(pdfViewer);
      } else if (["xlsx", "xls", "csv"].includes(ext) && typeof XLSX !== "undefined") {
        const arrayBuffer = await blob.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });

        const container = document.createElement("div");
        container.className = "google-sheet-viewer";

        const tableWrap = document.createElement("div");
        tableWrap.className = "google-sheet-table-wrap";

        function renderSheet(sheetName) {
          const worksheet = workbook.Sheets[sheetName];
          const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

          if (!data || !data.length) {
            tableWrap.innerHTML = '<div class="sheet-empty-state">(Planilha sem dados nesta aba)</div>';
            return;
          }

          let maxCols = 0;
          data.forEach(row => { if (row.length > maxCols) maxCols = row.length; });

          let tableHtml = '<table class="google-sheet-table"><thead><tr><th class="row-num"></th>';
          for (let c = 0; c < maxCols; c++) {
            let colName = "";
            let num = c;
            while (num >= 0) {
              colName = String.fromCharCode((num % 26) + 65) + colName;
              num = Math.floor(num / 26) - 1;
            }
            tableHtml += `<th>${colName}</th>`;
          }
          tableHtml += '</tr></thead><tbody>';

          data.forEach((row, rIdx) => {
            tableHtml += `<tr><th class="row-num">${rIdx + 1}</th>`;
            for (let c = 0; c < maxCols; c++) {
              const cellVal = row[c] !== undefined ? row[c] : "";
              tableHtml += `<td>${cellVal}</td>`;
            }
            tableHtml += '</tr>';
          });

          tableHtml += '</tbody></table>';
          tableWrap.innerHTML = tableHtml;
        }

        renderSheet(workbook.SheetNames[0]);
        container.appendChild(tableWrap);

        if (workbook.SheetNames.length > 0) {
          const tabsBar = document.createElement("div");
          tabsBar.className = "google-sheet-tabs";
          workbook.SheetNames.forEach((name, idx) => {
            const tabBtn = document.createElement("button");
            tabBtn.type = "button";
            tabBtn.className = `google-sheet-tab-item ${idx === 0 ? "is-active" : ""}`;
            tabBtn.textContent = name;
            tabBtn.addEventListener("click", () => {
              tabsBar.querySelectorAll(".google-sheet-tab-item").forEach(b => b.classList.remove("is-active"));
              tabBtn.classList.add("is-active");
              renderSheet(name);
            });
            tabsBar.appendChild(tabBtn);
          });
          container.appendChild(tabsBar);
        }

        attViewerContent.appendChild(container);
      } else {
        const iframe = document.createElement("iframe");
        iframe.src = activeViewerBlobUrl;
        iframe.className = "drive-preview-pdf";
        attViewerContent.appendChild(iframe);
      }
    } catch (err) {
      console.error(err);
      attViewerLoading.hidden = true;
      attViewerContent.innerHTML = `<div style="color:var(--danger); padding:20px;">Não foi possível carregar a pré-visualização: ${err.message}</div>`;
    }
  }

  function closeAttachmentViewer() {
    attachmentModal.hidden = true;
    attViewerContent.innerHTML = "";
    if (activeViewerBlobUrl) {
      URL.revokeObjectURL(activeViewerBlobUrl);
      activeViewerBlobUrl = null;
    }
    activeViewerBlob = null;
  }

  attViewerClose.addEventListener("click", closeAttachmentViewer);

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !attachmentModal.hidden) {
      closeAttachmentViewer();
    }
  });

  attViewerDownload.addEventListener("click", () => {
    if (!activeViewerBlob) return;
    triggerFileDownload(activeViewerBlob, activeViewerFilename);
  });

  attViewerPrint.addEventListener("click", () => {
    const ext = activeViewerFilename.split(".").pop().toLowerCase();

    // 1. Planilhas Excel / CSV
    if (["xlsx", "xls", "csv"].includes(ext)) {
      const tableWrap = attViewerContent.querySelector(".google-sheet-table-wrap");
      if (tableWrap) {
        printHtmlContent(activeViewerFilename, tableWrap.innerHTML);
        return;
      }
    }

    // 2. Imagens
    if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) {
      const imgHtml = `<div style="display:flex;justify-content:center;"><img src="${activeViewerBlobUrl}" style="max-width:100%;height:auto;" /></div>`;
      printHtmlContent(activeViewerFilename, imgHtml);
      return;
    }

    // 3. Documentos PDF
    if (ext === "pdf") {
      const existingFrame = document.getElementById("print-iframe");
      if (existingFrame) existingFrame.remove();

      const iframe = document.createElement("iframe");
      iframe.id = "print-iframe";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      iframe.src = activeViewerBlobUrl;

      iframe.onload = () => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => iframe.remove(), 2000);
      };

      document.body.appendChild(iframe);
    }
  });

  attViewerOpenwith.addEventListener("click", async () => {
    if (!activeViewerBlob) return;
    const ok = await ensureAuth();
    if (!ok) return;

    const originalLabel = attViewerOpenwithText.textContent;
    attViewerOpenwith.disabled = true;
    attViewerOpenwithText.textContent = "Enviando para o Google Drive...";

    try {
      const fileInfo = await getOrUploadDriveFile();
      if (fileInfo && fileInfo.id) {
        window.open(fileInfo.webViewLink || `https://drive.google.com/file/d/${fileInfo.id}/view`, "_blank");
      }
    } catch (err) {
      console.error(err);
      showToast("Erro ao abrir no Google Drive: " + err.message, true);
    } finally {
      attViewerOpenwithText.textContent = originalLabel;
      attViewerOpenwith.disabled = false;
    }
  });

  attViewerDrive.addEventListener("click", async () => {
    if (!activeViewerBlob) return;
    const ok = await ensureAuth();
    if (!ok) return;

    try {
      showToast("Enviando para o Google Drive...");
      await getOrUploadDriveFile();
      showSuccessToast("Arquivo salvo no Google Drive!");
    } catch (err) {
      console.error(err);
      showToast("Erro ao salvar no Drive: " + err.message, true);
    }
  });

  /* ---------- CAIXA DE ENTRADA ---------- */
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
        cachedInboxMessages = [];
        inboxTabList.innerHTML = "";
        inboxTabLoading.hidden = true;
        inboxTabEmpty.textContent = "Nenhum e-mail encontrado na caixa de entrada.";
        inboxTabEmpty.hidden = false;
        return;
      }

      const details = await Promise.all(
        refs.map(ref => gmailApiFetch(buildFullMessageUrl(ref.id)))
      );

      details.sort((a, b) => Number(b.internalDate) - Number(a.internalDate));
      cachedInboxMessages = details;

      if (seenMessageIds === null){
        seenMessageIds = new Set(details.map(d => d.id));
      } else {
        details.forEach(d => seenMessageIds.add(d.id));
      }

      if (currentInboxSubTab === "inbox") {
        renderInboxTabList(details);
        inboxTabSubtitle.textContent = `${details.length} e-mail(s) recebido(s) recentemente`;
      }
    } catch (error){
      console.error(error);
      showToast(`Não foi possível carregar a caixa de entrada: ${error.message}`, true);
    } finally {
      inboxTabLoading.hidden = true;
      inboxTabRefresh.classList.remove("is-spinning");
      isFetchingInboxTab = false;
    }
  }

  /* ---------- E-MAILS ENVIADOS ---------- */
  async function fetchSentTabList(){
    if (isFetchingInboxTab) return;
    isFetchingInboxTab = true;

    inboxTabLoading.hidden = false;
    inboxTabEmpty.hidden = true;
    inboxTabRefresh.classList.add("is-spinning");

    try {
      const listData = await gmailApiFetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&labelIds=SENT"
      );
      const refs = listData.messages || [];

      if (!refs.length){
        cachedSentMessages = [];
        inboxTabList.innerHTML = "";
        inboxTabLoading.hidden = true;
        inboxTabEmpty.textContent = "Nenhum e-mail enviado encontrado.";
        inboxTabEmpty.hidden = false;
        return;
      }

      const details = await Promise.all(
        refs.map(ref => gmailApiFetch(buildFullMessageUrl(ref.id)))
      );

      details.sort((a, b) => Number(b.internalDate) - Number(a.internalDate));
      cachedSentMessages = details;

      if (currentInboxSubTab === "sent") {
        renderInboxTabList(details, "sent");
        inboxTabSubtitle.textContent = `${details.length} e-mail(s) enviado(s) recentemente`;
      }
    } catch (error){
      console.error(error);
      showToast(`Não foi possível carregar os e-mails enviados: ${error.message}`, true);
    } finally {
      inboxTabLoading.hidden = true;
      inboxTabRefresh.classList.remove("is-spinning");
      isFetchingInboxTab = false;
    }
  }

  function openMailReader(msg, viewType = "inbox") {
    const isSent      = viewType === "sent";
    const headers     = msg.payload?.headers || [];
    const contactRaw  = isSent ? getHeader(headers, "To") : getHeader(headers, "From");
    const subject     = getHeader(headers, "Subject") || "(sem assunto)";
    const messageId   = getHeader(headers, "Message-Id");
    const dateLabel   = formatEmailDate(msg.internalDate, getHeader(headers, "Date"));
    const contactName = extractDisplayName(contactRaw) || extractEmailAddress(contactRaw);
    const contactEmail= extractEmailAddress(contactRaw);
    const attachments = extractAttachments(msg.payload);
    const bodyContent = extractMessageBody(msg.payload);
    const wasUnread   = !isSent && (msg.labelIds || []).includes("UNREAD");

    readingMailContext = {
      threadId: msg.threadId,
      messageId: messageId,
      to: contactEmail,
      fromName: contactName,
      subject: subject,
      gmailId: msg.id,
      isUnread: wasUnread,
      rawMsg: msg,
      viewType: viewType
    };

    if (readFromLabel) readFromLabel.textContent = isSent ? "Para:" : "De:";
    inboxReadUnreadBtn.style.display = isSent ? "none" : "";

    if (!isSent) {
      updateUnreadToggleButton(wasUnread);

      if (wasUnread){
        msg.labelIds = (msg.labelIds || []).filter(l => l !== "UNREAD");
        readingMailContext.isUnread = false;
        updateUnreadToggleButton(false);
        setListItemUnreadState(msg.id, false);
        setMessageReadState(msg.id, false);
      }
    }

    readSubject.textContent = subject;
    readFrom.textContent = `${contactName} <${contactEmail}>`;
    readDate.textContent = dateLabel;
    readBody.textContent = bodyContent || "(E-mail sem conteúdo de texto)";

    readAttachmentsList.innerHTML = "";
    if (attachments.length > 0) {
      readAttachmentsWrap.hidden = false;
      
      attachments.forEach(att => {
        const card = document.createElement("div");
        card.className = "inbox-attachment-card";

        card.innerHTML = `
          <div class="att-card-left" title="Abrir pré-visualização">
            <span class="att-card-icon">${getFileIconSvg(att.filename)}</span>
            <div class="att-card-meta">
              <strong class="att-card-title">${att.filename}</strong>
              <span class="att-card-size">${formatSize(att.size)}</span>
            </div>
          </div>
          <div class="att-card-actions">
            <button type="button" class="att-action-btn btn-view" title="Visualizar">
              <svg viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/></svg>
            </button>
            <button type="button" class="att-action-btn btn-dl" title="Fazer o download">
              <svg viewBox="0 0 24 24" fill="none"><path d="M12 15V3M12 15l-4-4M12 15l4-4M4 21h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
        `;

        const handleOpen = () => {
          if (att.attachmentId) {
            openAttachmentViewer(msg.id, att.attachmentId, att.filename, att.mimeType);
          }
        };

        card.querySelector(".att-card-left").addEventListener("click", handleOpen);
        card.querySelector(".btn-view").addEventListener("click", (e) => {
          e.stopPropagation();
          handleOpen();
        });

        card.querySelector(".btn-dl").addEventListener("click", async (e) => {
          e.stopPropagation();
          try {
            showToast("Baixando arquivo...");
            const blob = await fetchAttachmentBlob(msg.id, att.attachmentId, att.mimeType);
            triggerFileDownload(blob, att.filename);
          } catch (err) {
            showToast("Erro ao baixar anexo: " + err.message, true);
          }
        });

        readAttachmentsList.appendChild(card);
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
  });

  function renderInboxTabList(messages, viewType = "inbox"){
    const isSent = viewType === "sent";
    inboxTabList.innerHTML = "";
    inboxTabEmpty.hidden = true;

    messages.forEach(msg => {
      const headers    = msg.payload?.headers || [];
      const contactRaw = isSent ? getHeader(headers, "To") : getHeader(headers, "From");
      const subject    = getHeader(headers, "Subject") || "(sem assunto)";
      const messageId  = getHeader(headers, "Message-Id");
      const dateLabel  = formatEmailDate(msg.internalDate, getHeader(headers, "Date"));
      const contactName  = extractDisplayName(contactRaw) || extractEmailAddress(contactRaw);
      const contactEmail = extractEmailAddress(contactRaw);
      const attachments = extractAttachments(msg.payload);
      const isUnread = !isSent && (msg.labelIds || []).includes("UNREAD");

      const li = document.createElement("li");
      li.className = "inbox-tab-item" + (isUnread ? " is-unread" : "");
      li.dataset.msgId = msg.id;

      const attachmentsHtml = attachments.length
        ? `<div class="inbox-tab-attachments">${attachments.map(att => `
            <span class="inbox-attachment-chip" title="${att.filename}">
              ${getFileIconSvg(att.filename)}<span>${att.filename}</span>
            </span>`).join("")}</div>`
        : "";

      li.innerHTML = `
        <div class="inbox-tab-item-top">
          <span class="inbox-tab-item-from">${isUnread ? '<span class="unread-dot" aria-hidden="true"></span>' : ""}${isSent ? `Para: ${contactName}` : contactName}</span>
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

      li.addEventListener("click", () => {
        openMailReader(msg, viewType);
      });

      li.querySelector(".inbox-tab-reply-button").addEventListener("click", (e) => {
        e.stopPropagation();
        enterReplyMode({
          threadId: msg.threadId,
          messageId: messageId,
          to: contactEmail,
          fromName: contactName,
          subject: subject,
        });
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
          closeInboxModal();
          enterReplyMode({
            threadId: msg.threadId,
            messageId: messageId,
            to: fromEmail,
            fromName: fromName,
            subject: subject,
          });
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

      if (currentView === "inbox" && currentInboxSubTab === "inbox"){
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

    recipientEmails = [];
    if (ctx.to) {
      addRecipient(ctx.to);
    } else {
      renderRecipients();
    }

    let cleanSub = ctx.subject || "";
    if (cleanSub && !cleanSub.toLowerCase().startsWith("re:")) {
      cleanSub = `Re: ${cleanSub}`;
    }
    subjectInput.value = cleanSub;
    bodyInput.value = buildDefaultBody();

    replyBannerDetail.textContent = `Para ${ctx.fromName || ctx.to} — Conversa: ${ctx.subject}`;
    replyBanner.classList.add("is-visible");
    replyBanner.style.display = "flex";

    selectedStore = null;
    [...storeGrid.querySelectorAll(".store-chip")].forEach(c => c.classList.remove("is-active"));

    showComposeView();
    validateForm();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function exitReplyMode(){
    mode = "compose";
    replyContext = null;
    replyBanner.classList.remove("is-visible");
    replyBanner.style.display = "none";

    selectedStore = null;
    [...storeGrid.querySelectorAll(".store-chip")].forEach(c => c.classList.remove("is-active"));

    recipientEmails = [];
    renderRecipients();
    subjectInput.value = "";
    bodyInput.value = buildDefaultBody();
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

  /* ---------- ANEXOS (FORMULÁRIO DE ENVIO) ---------- */
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
    scheduleAutoSaveDraft();
  }

  fileListEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".file-remove");
    if (!btn) return;
    attachedFiles.splice(Number(btn.dataset.index), 1);
    renderFileList();
    scheduleAutoSaveDraft();
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
    const ok = Boolean(recipientEmails.length > 0 && subjectInput.value.trim());
    sendButton.disabled = !ok || Boolean(pendingEmailPayload);
  }

  subjectInput.addEventListener("input", () => {
    validateForm();
    scheduleAutoSaveDraft();
  });

  bodyInput.addEventListener("input", scheduleAutoSaveDraft);

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

  async function buildRawEmail(savedData) {
    const boundary = "boundary_" + Math.random().toString(36).substring(2);
    const to = savedData.to || "";
    const subject = savedData.subject || "";
    const body = savedData.body || "";

    let emailParts = [];
    if (to) emailParts.push(`To: ${to}`);
    emailParts.push(`Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`);

    if (savedData.mode === "reply" && savedData.replyContext?.messageId){
      emailParts.push(`In-Reply-To: ${savedData.replyContext.messageId}`);
      emailParts.push(`References: ${savedData.replyContext.messageId}`);
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

    for (const file of (savedData.files || [])) {
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

  async function executeActualSend(dataToSend) {
    try {
      const raw = await buildRawEmail(dataToSend);
      const payload = { raw };
      if (dataToSend.mode === "reply" && dataToSend.replyContext?.threadId){
        payload.threadId = dataToSend.replyContext.threadId;
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
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || "Falha ao enviar e-mail.");
      }

      if (dataToSend.draftId) {
        deleteGmailDraft(dataToSend.draftId);
      }

      showSuccessToast(
        dataToSend.files.length
          ? `E-mail enviado com ${dataToSend.files.length} anexo(s)!`
          : "E-mail enviado com sucesso!"
      );
    } catch (error) {
      console.error(error);
      showToast(`Erro: ${error.message}`, true);
    }
  }

  function hideUndoToast() {
    undoToast.classList.remove("is-visible");
    if (undoCountdownTimer) {
      clearInterval(undoCountdownTimer);
      undoCountdownTimer = null;
    }
  }

  /* ---------- BOTÃO DESFAZER ENVIO ---------- */
  undoSendBtn.addEventListener("click", () => {
    if (!pendingEmailPayload) return;

    hideUndoToast();
    const restored = pendingEmailPayload;
    pendingEmailPayload = null;

    recipientEmails = [];
    if (restored.to) {
      addRecipient(restored.to);
    } else {
      renderRecipients();
    }

    subjectInput.value = restored.subject;
    bodyInput.value = restored.body;
    attachedFiles = [...restored.files];
    selectedStore = restored.selectedStore;
    mode = restored.mode;
    replyContext = restored.replyContext;
    currentGmailDraftId = restored.draftId;

    if (mode === "reply" && replyContext) {
      replyBannerDetail.textContent = `Para ${replyContext.fromName || replyContext.to} — Conversa: ${replyContext.subject}`;
      replyBanner.classList.add("is-visible");
      replyBanner.style.display = "flex";
    } else {
      replyBanner.classList.remove("is-visible");
      replyBanner.style.display = "none";
      [...storeGrid.querySelectorAll(".store-chip")].forEach(c =>
        c.classList.toggle("is-active", c.dataset.store === selectedStore)
      );
    }

    renderFileList();
    showComposeView();
    validateForm();
    showToast("Envio cancelado.");
  });

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

    const recipientString = recipientEmails.join(", ");
    const confirmedSend = await showConfirm({
      title: mode === "reply" ? "Confirmar resposta" : "Confirmar envio",
      message: `Enviar este e-mail para ${recipientString}?`,
      confirmText: "Enviar",
      cancelText: "Cancelar",
    });
    if (!confirmedSend) return;

    pendingEmailPayload = {
      draftId: currentGmailDraftId,
      to: recipientString,
      subject: subjectInput.value.trim(),
      body: bodyInput.value,
      files: [...attachedFiles],
      selectedStore: selectedStore,
      mode: mode,
      replyContext: replyContext
    };

    currentGmailDraftId = null;
    recipientEmails = [];
    renderRecipients();
    attachedFiles = [];
    renderFileList();
    if (mode === "reply") exitReplyMode();
    subjectInput.value = "";
    bodyInput.value = buildDefaultBody();
    selectedStore = null;
    [...storeGrid.querySelectorAll(".store-chip")].forEach(c => c.classList.remove("is-active"));
    validateForm();

    undoSecondsRemaining = 10;
    undoTimerEl.textContent = undoSecondsRemaining;
    undoToast.classList.add("is-visible");

    if (undoCountdownTimer) clearInterval(undoCountdownTimer);

    undoCountdownTimer = setInterval(async () => {
      undoSecondsRemaining--;
      undoTimerEl.textContent = undoSecondsRemaining;

      if (undoSecondsRemaining <= 0) {
        hideUndoToast();
        const finalData = pendingEmailPayload;
        pendingEmailPayload = null;
        validateForm();

        if (finalData) {
          await executeActualSend(finalData);
        }
      }
    }, 1000);
  });

  showComposeView();
  renderRecipients();
  validateForm();
})();