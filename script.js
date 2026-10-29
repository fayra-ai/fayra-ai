
const $ = (selector) => document.querySelector(selector);

const welcome = $("#welcome");
const chatPanel = $(".chat-panel");
const messages = $("#messages");
const input = $("#messageInput");
const form = $("#chatForm");
const sendButton = $("#sendButton");
const historyList = $("#historyList");
const sidebar = $("#sidebar");
const toast = $("#toast");

let chats = [];
let activeChatId = null;
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function createChat() {
  const chat = {
    id: Date.now() + Math.random(),
    title: "New conversation",
    messages: []
  };

  chats.unshift(chat);
  activeChatId = chat.id;

  renderHistory();
  renderChat();
  input.value = "";
  input.focus();
  sidebar.classList.remove("open");
}

function getActiveChat() {
  return chats.find(chat => chat.id === activeChatId);
}

function renderHistory() {
  historyList.replaceChildren();

  chats.forEach(chat => {
    const button = document.createElement("button");
    button.className = "history-item";
    button.textContent = "◦  " + chat.title;
    button.title = chat.title;

    button.addEventListener("click", () => {
      activeChatId = chat.id;
      renderChat();
      sidebar.classList.remove("open");
    });

    historyList.appendChild(button);
  });
}

function renderChat() {
  const chat = getActiveChat();
  const hasMessages = Boolean(chat && chat.messages.length);

  welcome.classList.toggle("hidden", hasMessages);
  chatPanel.classList.toggle("visible", hasMessages);

  messages.replaceChildren();

  if (!hasMessages) return;

  chat.messages.forEach(message => {
    const row = document.createElement("div");
    row.className = "message " + message.role;

    if (message.role === "assistant") {
      const badge = document.createElement("div");
      badge.className = "message-badge";
      badge.textContent = "✳";
      row.appendChild(badge);
    }

    const body = document.createElement("div");
    body.className = "message-body";
    body.textContent = message.content;

    row.appendChild(body);
    messages.appendChild(row);
  });

  messages.scrollTop = messages.scrollHeight;
}

function addMessage(role, content) {
  const chat = getActiveChat();
  if (!chat) return;

  chat.messages.push({ role, content });

  if (role === "user" && chat.title === "New conversation") {
    chat.title = content.slice(0, 30) +
      (content.length > 30 ? "…" : "");
  }

  renderHistory();
  renderChat();
}


async function submitMessage(text) {
  const content = (text || input.value).trim();

  if (!content) {
    input.focus();
    return;
  }

  if (!activeChatId || !getActiveChat()) {
    createChat();
  }

  const chatId = activeChatId;

  addMessage("user", content);
  input.value = "";
  input.style.height = "auto";

  sendButton.disabled = true;
  input.disabled = true;

  addMessage("assistant", "Fayra is thinking...");

  try {
    const response = await fetch(
      "https://aiugrunsflrxmfigzum.supabase.co/functions/v1/fayra-chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: content
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.details?.error?.message ||
        data.error ||
        `Request failed (${response.status})`
      );
    }

    const chat = chats.find(item => item.id === chatId);

    if (chat) {
      const thinkingIndex = chat.messages.findIndex(
        message =>
          message.role === "assistant" &&
          message.content === "Fayra is thinking..."
      );

      if (thinkingIndex !== -1) {
        chat.messages[thinkingIndex].content =
          data.reply || "Sorry, I couldn't generate a reply.";
      }

      renderHistory();

      if (activeChatId === chatId) {
        renderChat();
      }
    }
  } catch (error) {
    const chat = chats.find(item => item.id === chatId);

    if (chat) {
      const thinkingIndex = chat.messages.findIndex(
        message =>
          message.role === "assistant" &&
          message.content === "Fayra is thinking..."
      );

      const errorMessage =
        "Sorry, I couldn't connect to Fayra. Please try again.";

      if (thinkingIndex !== -1) {
        chat.messages[thinkingIndex].content = errorMessage;
      }

      if (activeChatId === chatId) {
        renderChat();
      }
    }

    console.error("Fayra error:", error);
    showToast("Fayra connection failed. Check the browser console.");
  } finally {
    sendButton.disabled = false;
    input.disabled = false;
    input.focus();
  }
}


$("#newChat").addEventListener("click", createChat);

$("#homeButton").addEventListener("click", () => {
  if (activeChatId) {
    activeChatId = null;
    renderChat();
  }
  sidebar.classList.remove("open");
});

$("#historyButton").addEventListener("click", () => {
  if (chats.length === 0) {
    showToast("Your recent chats will appear here.");
  } else {
    showToast("Choose a conversation from the sidebar.");
  }
});

form.addEventListener("submit", event => {
  event.preventDefault();
  submitMessage();
});

input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 150) + "px";
});

input.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

document.querySelectorAll("[data-prompt]").forEach(button => {
  button.addEventListener("click", () => {
    submitMessage(button.dataset.prompt);
  });
});

$("#themeButton").addEventListener("click", () => {
  document.body.classList.toggle("light-mode");

  const isLight = document.body.classList.contains("light-mode");
  $("#themeButton").textContent = isLight ? "☾" : "☼";
  showToast(isLight ? "Light theme enabled." : "Dark theme enabled.");
});

$("#menuButton").addEventListener("click", () => {
  sidebar.classList.toggle("open");
});

$("#attachButton").addEventListener("click", () => {
  showToast("File attachments will be added in a future update.");
});

// Initial state
renderHistory();
renderChat();
