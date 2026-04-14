"use strict";

const courseId = new URLSearchParams(window.location.search).get("courseId");
const messageForm = document.querySelector("#messageForm");
const messageInput = document.querySelector("#message");
const messageArea = document.querySelector("#messageArea");
const headerStatus = document.querySelector("#header-status");

let stompClient = null;
let currentUser = null;
let historyLoaded = false;
const userProfiles = new Map();

const colors = ["#667eea", "#764ba2", "#f093fb", "#4facfe", "#43e97b", "#fa709a", "#30cfd0", "#a8edea"];
const reactionEmojis = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

function getAvatarColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = 31 * hash + name.charCodeAt(i);
    return colors[Math.abs(hash % colors.length)];
}

function escapeHtml(text) {
    if (!text) return "";
    return text.replace(
        /[&<>"']/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]
    );
}

function waitForUser() {
    return new Promise((resolve) => {
        const check = setInterval(() => {
            if (currentSessionUser) {
                clearInterval(check);
                resolve();
            }
        }, 50);
    });
}

async function init() {
    if (!courseId) {
        showToast("No course selected");
        setTimeout(() => (window.location.href = "/courses.html"), 1500);
        return;
    }

    await waitForUser();

    currentUser = {
        id: currentSessionUser.userId,
        name: currentSessionUser.name,
        avatarUrl: currentSessionUser.avatarUrl,
    };

    try {
        const courseRes = await fetch(`${GATEWAY_URL}/course-service/api/courses/${courseId}`);
        if (courseRes.ok) {
            const course = await courseRes.json();
            const titleEl = document.getElementById("courseTitle");
            if (titleEl) titleEl.textContent = course.title + " — Chat";
            document.title = course.title + " Chat | ITBook";
        }
    } catch (_) {}

    try {
        const enrollRes = await fetch(
            `${GATEWAY_URL}/course-service/api/courses/${courseId}/enrolled/${currentUser.id}`,
            {
                headers: { Authorization: "Bearer " + getToken() },
            }
        );
        const isEnrolled = await enrollRes.json();
        if (!isEnrolled) {
            window.location.href = "/courses.html";
            return;
        }
    } catch (e) {
        window.location.href = "/courses.html";
        return;
    }

    await loadHistory();
    connect();
}

function formatTime(timestamp) {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

async function loadHistory() {
    try {
        const res = await fetch(`${GATEWAY_URL}/chat-service/api/chat/course/${courseId}/history`, {
            headers: { Authorization: "Bearer " + getToken() },
        });
        if (res.ok) {
            const messages = await res.json();
            await ensureUsersLoaded(messages.map((msg) => msg.userId));
            messages.forEach((msg) => renderMessage(msg));
            messageArea.scrollTop = messageArea.scrollHeight;
        }
    } catch (e) {
        console.error("Failed to load history", e);
    } finally {
        historyLoaded = true;
    }
}

async function ensureUsersLoaded(userIds) {
    const missingUserIds = Array.from(
        new Set(
            (userIds || [])
                .filter((id) => id != null)
                .map((id) => Number(id))
                .filter((id) => Number.isFinite(id) && !userProfiles.has(id))
        )
    );

    if (missingUserIds.length === 0) return;

    try {
        const res = await fetch(
            `${GATEWAY_URL}/user-service/api/auth/internal/users?ids=${missingUserIds.join(",")}`,
            { headers: { Authorization: "Bearer " + getToken() } }
        );
        if (!res.ok) return;
        const users = await res.json();
        users.forEach((u) => {
            userProfiles.set(Number(u.id), {
                name: u.fullName || "Unknown user",
                avatarUrl: u.avatarUrl || "",
            });
        });
    } catch (e) {
        console.error("Failed to load user profiles", e);
    }
}

function getUserProfile(userId) {
    const id = Number(userId);
    if (currentUser && Number(currentUser.id) === id) {
        return {
            name: currentUser.name || "You",
            avatarUrl: currentUser.avatarUrl || "",
        };
    }
    return userProfiles.get(id) || { name: "Unknown user", avatarUrl: "" };
}

function connect() {
    const socket = new SockJS(`${GATEWAY_URL}/chat-service/ws`);
    stompClient = Stomp.over(socket);
    stompClient.debug = null;
    stompClient.connect({}, onConnected, onError);
}

function onConnected() {
    stompClient.subscribe("/topic/course/" + courseId, onMessageReceived);
    stompClient.subscribe("/user/queue/errors", (msg) => {
        console.error("Server error:", msg.body);
        showToast(msg.body);
    });

    const sendJoin = () => {
        stompClient.send(
            "/app/chat.addUser",
            {},
            JSON.stringify({
                courseId: parseInt(courseId),
                content: getToken(),
                type: "JOIN",
            })
        );
        headerStatus.textContent = "Active now";
    };

    if (historyLoaded) {
        sendJoin();
    } else {
        const wait = setInterval(() => {
            if (historyLoaded) {
                clearInterval(wait);
                sendJoin();
            }
        }, 50);
    }
}

function onError() {
    headerStatus.textContent = "Connection failed";
    headerStatus.style.color = "#e74c3c";
}

function sendMessage(event) {
    event.preventDefault();
    const content = Array.from(messageInput.childNodes)
        .map((n) => (n.nodeName === "IMG" ? n.getAttribute("alt") : n.textContent))
        .join("")
        .trim();
    if (!content || !stompClient) return;

    stompClient.send(
        "/app/chat.sendMessage",
        {},
        JSON.stringify({
            courseId: parseInt(courseId),
            content,
            type: "MESSAGE",
        })
    );

    messageInput.innerHTML = "";
}

function renderSystemMessage(text) {
    const el = document.createElement("div");
    el.className = "event-message";
    el.innerHTML = `<p>${escapeHtml(text)}</p>`;
    messageArea.appendChild(el);
    messageArea.scrollTop = messageArea.scrollHeight;
}

async function onMessageReceived(payload) {
    const message = JSON.parse(payload.body);
    await ensureUsersLoaded([message.userId]);
    const profile = getUserProfile(message.userId);

    if (message.type === "JOIN") {
        if (message.id) {
            const text =
                Number(message.userId) === Number(currentUser.id) ? "You joined the chat 🎉" : `${profile.name} joined the chat 🎉`;
            renderSystemMessage(text);
        }
        return;
    }

    if (message.type === "LEAVE") {
        const text = Number(message.userId) === Number(currentUser.id) ? "You left the chat" : `${profile.name} left the chat`;
        renderSystemMessage(text);
        return;
    }

    if (message.type !== "MESSAGE") return;

    const existing = document.querySelector(`[data-message-id="${message.id}"]`);
    if (existing) {
        const newEl = buildMessageElement(message);
        twemoji.parse(newEl, { folder: "svg", ext: ".svg" });
        existing.replaceWith(newEl);
        return;
    }
    renderMessage(message);
    messageArea.scrollTop = messageArea.scrollHeight;
}

function renderMessage(message) {
    const profile = getUserProfile(message.userId);
    if (message.type === "JOIN") {
        const text =
            Number(message.userId) === Number(currentUser?.id) ? "You joined the chat 🎉" : `${profile.name} joined the chat 🎉`;
        renderSystemMessage(text);
        return;
    }
    if (message.type === "LEAVE") {
        const text = Number(message.userId) === Number(currentUser?.id) ? "You left the chat" : `${profile.name} left the chat`;
        renderSystemMessage(text);
        return;
    }
    if (message.type !== "MESSAGE") return;
    const el = buildMessageElement(message);
    messageArea.appendChild(el);
    twemoji.parse(el, { folder: "svg", ext: ".svg" });
}

function buildMessageElement(message) {
    const el = document.createElement("div");
    if (message.type === "JOIN" || message.type === "LEAVE") return el;

    const profile = getUserProfile(message.userId);
    const isMine = Number(message.userId) === Number(currentUser?.id);
    const avatarColor = getAvatarColor(profile.name);
        const senderInitial = profile.name?.[0]?.toUpperCase() ?? "?";
        const avatarHtml = profile.avatarUrl
            ? `<div class="avatar"><img src="${GATEWAY_URL}${profile.avatarUrl}" alt="avatar"></div>`
            : `<div class="avatar" style="background-color:${avatarColor}">${senderInitial}</div>`;

    const deletedClass = message.isDeleted ? " deleted" : "";
    const editedLabel = message.editedAt ? '<span class="edited-label">(edited)</span>' : "";

    let reactionsHtml = "";
    if (!message.isDeleted && message.reactions && message.reactions !== "{}") {
        try {
            const reactions = JSON.parse(message.reactions);
            if (Object.keys(reactions).length > 0) {
                reactionsHtml =
                    '<div class="reactions-container">' +
                    Object.entries(reactions)
                        .map(([emoji, users]) => {
                            const names = Array.isArray(users)
                                                            ? users
                                                                  .map((userId) => getUserProfile(Number(userId)).name)
                                                                  .join(", ")
                                                            : getUserProfile(Number(users)).name;
                            const count = Array.isArray(users) ? users.length : users;
                            return `
                                <span class="reaction" data-emoji="${emoji}" onclick="toggleReactionUsers(this)">
                                    ${emoji} ${count}
                                </span>
                                <span class="reaction-names" style="display:none">${escapeHtml(names)}</span>
                            `;
                        })
                        .join("") +
                    "</div>";
            }
        } catch (_) {}
    }

    const actionButtons =
        isMine && !message.isDeleted
            ? `<div class="message-actions">
                <button class="action-btn edit-btn"   data-id="${message.id}" title="Edit"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete-btn" data-id="${message.id}" title="Delete"><i class="fas fa-trash"></i></button>
           </div>`
            : !message.isDeleted
              ? `<button class="action-btn reaction-btn" data-id="${message.id}" title="React"><i class="fas fa-smile"></i></button>`
              : "";

    el.classList.add("message-group", isMine ? "sent" : "received");
    el.setAttribute("data-message-id", message.id);
    el.innerHTML = `
        ${!isMine ? avatarHtml : ""}
        <div class="message-content">
            ${!isMine ? `<div class="message-sender">${escapeHtml(profile.name)}</div>` : ""}
                        <div class="message-wrapper">
                <div class="message-text${deletedClass}">
                    ${escapeHtml(message.content)} ${editedLabel}
                    <span class="message-time">${formatTime(message.timestamp)}</span>
                </div>
                ${actionButtons}
            </div>
            ${reactionsHtml}
        </div>
    `;

    el.querySelector(".edit-btn")?.addEventListener("click", () => openEditModal(message));
    el.querySelector(".delete-btn")?.addEventListener("click", () => deleteMessage(message.id));
    el.querySelector(".reaction-btn")?.addEventListener("click", (e) => showReactionPicker(e, message.id));

    return el;
}

function toggleReactionUsers(el) {
    const names = el.nextElementSibling;
    document.querySelectorAll(".reaction-names").forEach((n) => {
        if (n !== names) n.style.display = "none";
    });
    names.style.display = names.style.display === "none" ? "inline" : "none";
}

function openEditModal(message) {
    const el = document.querySelector(`[data-message-id="${message.id}"]`);
    if (!el) return;

    const bubble = el.querySelector(".message-text");
    const wrapper = el.querySelector(".message-wrapper");
    if (!bubble || wrapper.querySelector(".edit-input-wrap")) return;

    const originalText = message.content;

    bubble.style.display = "none";
    el.querySelector(".message-actions").style.display = "none";

    const editWrap = document.createElement("div");
    editWrap.className = "edit-input-wrap";
    editWrap.innerHTML = `
        <div class="edit-input" contenteditable="true"></div>
        <div class="edit-actions">
            <button type="button" class="edit-emoji-btn"><i class="fas fa-face-smile"></i></button>
            <button type="button" class="edit-save-btn"><i class="fas fa-check"></i></button>
            <button type="button" class="edit-cancel-btn"><i class="fas fa-times"></i></button>
        </div>
    `;
    wrapper.appendChild(editWrap);
    const editDiv = editWrap.querySelector(".edit-input");
    editDiv.textContent = originalText;
    twemoji.parse(editDiv, { folder: "svg", ext: ".svg" });

    const textarea = editWrap.querySelector(".edit-input");
    textarea.focus();
    const r = document.createRange();
    r.selectNodeContents(textarea);
    r.collapse(false);
    const s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);

    function save() {
        const newContent = Array.from(textarea.childNodes)
            .map((n) => (n.nodeName === "IMG" ? n.getAttribute("alt") : n.textContent))
            .join("")
            .trim();
        if (newContent && newContent !== originalText) {
            stompClient.send(
                "/app/chat.editMessage",
                {},
                JSON.stringify({
                    id: message.id,
                    content: newContent,
                    type: "MESSAGE",
                })
            );
        }
        cancel();
    }

    function cancel() {
        editWrap.remove();
        bubble.style.display = "";
        el.querySelector(".message-actions").style.display = "";
    }

    editWrap.querySelector(".edit-emoji-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        const existing = editWrap.querySelector(".emoji-panel");
        if (existing) {
            existing.remove();
            return;
        }

        const panel = buildEmojiPanel(textarea);
        editWrap.appendChild(panel);
        panel.style.position = "static";
        panel.style.marginTop = "6px";
        panel.style.animation = "none";
    });

    editWrap.querySelector(".edit-save-btn").addEventListener("click", save);
    editWrap.querySelector(".edit-cancel-btn").addEventListener("click", cancel);

    textarea.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            save();
        }
        if (e.key === "Escape") cancel();
    });
}

function deleteMessage(id) {
    if (confirm("Delete this message?")) {
        stompClient.send("/app/chat.deleteMessage", {}, JSON.stringify({ id, type: "MESSAGE" }));
    }
}

function showReactionPicker(event, messageId) {
    event.stopPropagation();
    document.querySelector(".reaction-picker")?.remove();

    const picker = document.createElement("div");
    picker.className = "reaction-picker";
    picker.innerHTML = reactionEmojis.map((e) => `<span class="reaction-emoji" data-emoji="${e}">${e}</span>`).join("");

    const btn = event.target.closest(".reaction-btn");
    btn.parentElement.appendChild(picker);

    twemoji.parse(picker, { folder: "svg", ext: ".svg" });

    const btnRect = btn.getBoundingClientRect();
    if (btnRect.top < 120) {
        picker.style.bottom = "auto";
        picker.style.top = "calc(100% + 6px)";
    }

    picker.querySelectorAll(".reaction-emoji").forEach((el) => {
        el.addEventListener("click", (e) => {
            e.stopPropagation();
            addReaction(messageId, el.dataset.emoji);
            picker.remove();
        });
    });

    setTimeout(() => {
        document.addEventListener("click", function close(e) {
            if (!e.target.closest(".reaction-picker") && !e.target.closest(".reaction-btn")) {
                picker.remove();
                document.removeEventListener("click", close);
            }
        });
    }, 0);
}

function addReaction(messageId, emoji) {
    stompClient.send(
        "/app/chat.addReaction",
        {},
        JSON.stringify({
            id: messageId,
            originalContent: emoji,
            type: "MESSAGE",
        })
    );
}

function logout() {
    if (stompClient?.connected) {
        stompClient.disconnect(() => {
            localStorage.clear();
            window.location.href = "/login.html";
        });
    } else {
        localStorage.clear();
        window.location.href = "/login.html";
    }
}

document.addEventListener("click", (e) => {
    if (!e.target.closest(".reaction")) {
        document.querySelectorAll(".reaction-names").forEach((n) => (n.style.display = "none"));
    }
});

messageInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        messageForm.dispatchEvent(new Event("submit"));
    }
});

messageForm.addEventListener("submit", sendMessage);

const emojiCategories = [
    {
        icon: '😀', label: 'Smileys',
        emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥸','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖']
    },
    {
        icon: '👋', label: 'People',
        emojis: ['👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🫀','🫁','🧠','🦷','🦴','👀','👁️','👅','👄','🫦','💋','👶','🧒','👦','👧','🧑','👱','👨','🧔','👩','🧓','👴','👵','🙍','🙎','🙅','🙆','💁','🙋','🧏','🙇','🤦','🤷']
    },
    {
        icon: '🐶', label: 'Animals',
        emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋','🐌','🐞','🐜','🪲','🦟','🦗','🕷️','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🦣','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🦬','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐕‍🦺','🐈','🐈‍⬛','🪶','🐓','🦃','🦤','🦚','🦜','🦢','🦩','🕊️','🐇','🦝','🦨','🦡','🦫','🦦','🦥','🐁','🐀','🐿️','🦔']
    },
    {
        icon: '🍕', label: 'Food',
        emojis: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🧄','🧅','🥔','🍠','🫘','🌰','🥜','🍞','🥐','🥖','🫓','🥨','🥯','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🦴','🌭','🍔','🍟','🍕','🫔','🌮','🌯','🥙','🧆','🥚','🍜','🍝','🍛','🍲','🫕','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥮','🍢','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🧃','🥤','🧋','☕','🍵','🫖','🍶','🍺','🍻','🥂','🍷','🫗','🥃','🍸','🍹','🧉','🍾']
    },
    {
        icon: '⚽', label: 'Activity',
        emojis: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🥍','🏏','🪃','🥅','⛳','🪁','🎣','🤿','🎽','🎿','🛷','🥌','🎯','🪀','🪁','🎱','🔫','🎮','🕹️','🎲','🧩','🧸','🪅','🎭','🎨','🖼️','🎪','🎠','🎡','🎢','🎬','🎤','🎧','🎼','🎹','🥁','🪘','🎷','🎺','🪗','🎸','🪕','🎻','🏆','🥇','🥈','🥉','🏅','🎖️','🎗️','🏵️','🎫','🎟️']
    },
    {
        icon: '🌍', label: 'Travel',
        emojis: ['🌍','🌎','🌏','🌐','🗺️','🧭','🏔️','⛰️','🌋','🗻','🏕️','🏖️','🏜️','🏝️','🏞️','🏟️','🏛️','🏗️','🧱','🪨','🪵','🛖','🏠','🏡','🏢','🏣','🏤','🏥','🏦','🏨','🏩','🏪','🏫','🏬','🏭','🏯','🏰','💒','🗼','🗽','⛪','🕌','🛕','🕍','⛩️','🕋','⛲','⛺','🌁','🌃','🏙️','🌄','🌅','🌆','🌇','🌉','♾️','🎠','🎡','🎢','💈','⛽','🛢️','🚂','🚃','🚄','🚅','🚆','🚇','🚈','🚉','🚊','🚝','🚞','🚋','🚌','🚍','🚎','🚐','🚑','🚒','🚓','🚔','🚕','🚖','🚗','🚘','🚙','🛻','🚚','🚛','🚜','🏎️','🏍️','🛵','🛺','🚲','🛴','🛹','🛼','🚏','🛣️','🛤️','⛽','🚧','⚓','🛟','⛵','🚤','🛥️','🛳️','⛴️','🚢','✈️','🛩️','🛫','🛬','🪂','💺','🚁','🚟','🚠','🚡','🛰️','🚀','🛸']
    },
    {
        icon: '💡', label: 'Objects',
        emojis: ['💌','🕵️','💣','🪓','🔪','🗡️','⚔️','🛡️','🪚','🔧','🪛','🔩','⚙️','🗜️','⚖️','🪝','🔗','⛓️','🪤','🧲','🔫','💊','🩺','🩻','🩹','🩼','🩺','🔭','🔬','🪬','🧿','💈','⚗️','🔭','📡','💉','🩸','🧬','🦠','🧫','🧪','🌡️','🧹','🧺','🧻','🚽','🚰','🚿','🛁','🛀','🪥','🧼','🫧','🪒','🧽','🪣','🧴','🧷','🧹','🧺','🧻','🪣','🧸','🪆','🖼️','🧵','🪡','🧶','🪢','👓','🕶️','🥽','🌂','☂️','🧵','🧶','💎','🔮','🪬','🧿','🪩','💡','🔦','🕯️','🪔','🧱','💰','💴','💵','💶','💷','💸','💳','🪙','💹','📈','📉','📊','📋','🗒️','🗓️','📆','📅','🗑️','📁','📂','🗂️','📓','📔','📒','📕','📗','📘','📙','📚','📖','🔖','🏷️','💼','📎','🖇️','📐','📏','🧮','📌','📍','✂️','🖊️','🖋️','✒️','🖌️','🖍️','📝','✏️','🔍','🔎','🔏','🔐','🔒','🔓']
    },
    {
        icon: '❤️', label: 'Symbols',
        emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛️','🉑','☢️','☣️','📴','📳','🈶','🈚','🈸','🈺','🈷️','✴️','🆚','💮','🉐','㊙️','㊗️','🈴','🈵','🈹','🈲','🅰️','🅱️','🆎','🆑','🅾️','🆘','❌','⭕','🛑','⛔','📛','🚫','💯','💢','♨️','🚷','🚯','🚳','🚱','🔞','📵','🚭','❗','❕','❓','❔','‼️','⁉️','🔅','🔆','〽️','⚠️','🔱','♻️','✅','🈯','💹','❎','🌐','💠','Ⓜ️','🌀','💤','🏧','🚾','♿','🅿️','🛗','🈳','🈂️','🛂','🛃','🛄','🛅','🚹','🚺','🚼','⚧️','🚻','🚮','🎦','📶','🈁','🔣','ℹ️','🔤','🔡','🔠','🆖','🆗','🆙','🆒','🆕','🆓','0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟','🔢','#️⃣','*️⃣','⏏️','▶️','⏸️','⏹️','⏺️','⏭️','⏮️','⏩','⏪','⏫','⏬','◀️','🔼','🔽','➡️','⬅️','⬆️','⬇️','↗️','↘️','↙️','↖️','↕️','↔️','↪️','↩️','⤴️','⤵️','🔀','🔁','🔂','🔄','🔃','🎵','🎶','➕','➖','➗','✖️','♾️','💲','💱','™️','©️','®️','〰️','➰','➿','🔚','🔙','🔛','🔝','🔜','✔️','☑️','🔘','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🟤','🔺','🔻','🔸','🔹','🔶','🔷','🔳','🔲','▪️','▫️','◾','◽','◼️','◻️','🟥','🟧','🟨','🟩','🟦','🟪','⬛','⬜','🟫','🔈','🔇','🔉','🔊','🔔','🔕','📣','📢','👁️‍🗨️','💬','💭','🗯️','♠️','♣️','♥️','♦️','🃏','🎴','🀄']
    }
];

function buildEmojiPanel(targetInput = messageInput) {
    const panel = document.createElement("div");
    panel.id = "emojiPanel";
    panel.className = "emoji-panel";

    const tabs = document.createElement("div");
    tabs.className = "emoji-tabs";
    tabs.innerHTML = emojiCategories
        .map(
            (cat, i) =>
                `<button type="button" class="emoji-tab${i === 0 ? " active" : ""}" data-index="${i}" title="${cat.label}">${cat.icon}</button>`
        )
        .join("");
    panel.appendChild(tabs);

    const grid = document.createElement("div");
    grid.className = "emoji-grid";
    panel.appendChild(grid);

    function renderCategory(index) {
        grid.innerHTML = emojiCategories[index].emojis
            .map((e) => `<button type="button" class="emoji-key" data-emoji="${e}">${e}</button>`)
            .join("");

        grid.querySelectorAll(".emoji-key").forEach((btn) => {
            btn.addEventListener("click", () => {
                targetInput.focus();
                const sel = window.getSelection();
                let range =
                    sel.rangeCount && targetInput.contains(sel.anchorNode)
                        ? sel.getRangeAt(0)
                        : (() => {
                              const r = document.createRange();
                              r.selectNodeContents(targetInput);
                              r.collapse(false);
                              return r;
                          })();
                range.deleteContents();
                const txt = document.createTextNode(btn.dataset.emoji + " ");
                range.insertNode(txt);
                range.setStartAfter(txt);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
                twemoji.parse(targetInput, { folder: "svg", ext: ".svg" });
                const nodes = targetInput.childNodes;
                const last = nodes[nodes.length - 1];
                if (last) {
                    range = document.createRange();
                    range.setStartAfter(last);
                    range.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            });
        });
        requestAnimationFrame(() => twemoji.parse(grid, { folder: "svg", ext: ".svg" }));
    }

    tabs.querySelectorAll(".emoji-tab").forEach((tab) => {
        tab.addEventListener("click", () => {
            tabs.querySelectorAll(".emoji-tab").forEach((t) => t.classList.remove("active"));
            tab.classList.add("active");
            renderCategory(parseInt(tab.dataset.index));
        });
    });

    renderCategory(0);
    requestAnimationFrame(() => twemoji.parse(grid, { folder: "svg", ext: ".svg" }));
    return panel;
}

const emojiToggle = document.getElementById("emojiToggle");

emojiToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const existing = document.getElementById("emojiPanel");
    if (existing) {
        existing.remove();
        return;
    }

    const panel = buildEmojiPanel();
    document.querySelector(".message-form").appendChild(panel);
});

document.addEventListener("click", (e) => {
    if (!e.target.closest("#emojiPanel") && !e.target.closest("#emojiToggle")) {
        document.getElementById("emojiPanel")?.remove();
    }
});

init();