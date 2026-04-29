const COZE_BASE = process.env.COZE_BASE_URL || 'https://api.coze.cn';
const PAT_TOKEN = process.env.COZE_PAT_TOKEN || '';
const WORKSPACE_ID = process.env.COZE_WORKSPACE_ID || '';
const BOT_ID = process.env.COZE_BOT_ID || '';
const WORKFLOW_ID = process.env.COZE_WORKFLOW_ID || '';

const AGENT_MAP = {
  nutritionist: { name: '营养师', prompt: '你是一名专业的慢病营养师，请根据患者情况给出饮食建议。' },
  exercise_coach: { name: '运动教练', prompt: '你是一名专业的康复运动教练，请根据患者情况给出运动方案。' },
  supervisor: { name: '健康监督员', prompt: '你是一名慢病健康监督员，请根据患者数据给出综合健康建议。' },
  doctor: { name: '全科医生', prompt: '你是一名社区全科医生，请回答患者的健康咨询。' },
};

async function callCozeChat(userMessage, agentType = 'doctor') {
  assertCozeConfig(['COZE_PAT_TOKEN', 'COZE_WORKSPACE_ID']);

  if (!AGENT_MAP[agentType]) {
    throw new Error(`Unknown agent type: ${agentType}. Available: ${Object.keys(AGENT_MAP).join(', ')}`);
  }

  const agentInfo = AGENT_MAP[agentType];

  // Create a conversation first
  const convResp = await fetch(`${COZE_BASE}/v1/conversation/create`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PAT_TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': '*/*',
    },
    body: JSON.stringify({
      workspace_id: WORKSPACE_ID,
      meta_data: { agent_type: agentType }
    })
  });

  const convData = await convResp.json();
  if (convData.code !== 0) {
    throw new Error(`Coze conversation creation failed: ${convData.msg}`);
  }

  const conversationId = convData.data.id;

  // Send message to conversation
  const msgResp = await fetch(
    `${COZE_BASE}/v1/conversation/message/create?conversation_id=${conversationId}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAT_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': '*/*',
      },
      body: JSON.stringify({
        role: 'user',
        content: `[${agentInfo.name}]\n${agentInfo.prompt}\n\n用户问题：${userMessage}`,
        content_type: 'text'
      })
    }
  );

  const msgData = await msgResp.json();
  if (msgData.code !== 0) {
    throw new Error(`Coze message sending failed: ${msgData.msg}`);
  }

  // Poll for response (simplified - in production use streaming)
  await new Promise(r => setTimeout(r, 2000));

  // Get last bot message
  const historyResp = await fetch(
    `${COZE_BASE}/v1/conversation/message/list?conversation_id=${conversationId}&order=desc&limit=3`,
    {
      headers: {
        'Authorization': `Bearer ${PAT_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': '*/*',
      }
    }
  );

  const historyData = await historyResp.json();
  if (historyData.code !== 0) {
    throw new Error(`Coze history fetch failed: ${historyData.msg}`);
  }

  const messages = historyData.data || [];
  const botReply = messages.find(m => m.role === 'assistant');

  if (!botReply) {
    throw new Error('Coze workspace 中未找到已发布的 Bot，请先在 Coze 中创建并发布 Bot');
  }

  return {
    conversation_id: conversationId,
    reply: botReply.content,
    agent_type: agentType,
    agent_name: agentInfo.name,
  };
}

async function callCozeBot(userMessage, agentType = 'doctor', extra = {}) {
  assertCozeConfig(['COZE_PAT_TOKEN', 'COZE_BOT_ID']);

  const agentInfo = AGENT_MAP[agentType] || AGENT_MAP.doctor;
  const payload = {
    bot_id: BOT_ID,
    user_id: String(extra.userId || extra.patientId || 'demo-user'),
    stream: false,
    auto_save_history: true,
    additional_messages: [
      {
        role: 'user',
        content: `[${agentInfo.name}]\n${agentInfo.prompt}\n\n${userMessage}`,
        content_type: 'text'
      }
    ]
  };

  const resp = await fetch(`${COZE_BASE}/v3/chat`, {
    method: 'POST',
    headers: cozeHeaders(),
    body: JSON.stringify(payload)
  });

  const data = await readCozeJson(resp, 'Coze bot chat failed');
  const chatId = data.data?.id || data.id || '';
  const conversationId = data.data?.conversation_id || data.conversation_id || '';
  const chat = await pollCozeChat(conversationId, chatId);
  const messages = await listCozeChatMessages(conversationId, chatId);
  const reply = pickAssistantReply(messages)
    || data.data?.answer
    || data.answer
    || getChatFallbackReply(chat);

  return {
    conversation_id: conversationId,
    chat_id: chatId,
    reply,
    agent_type: agentType,
    agent_name: agentInfo.name,
    raw: { chat, messages }
  };
}

async function runCozeWorkflow(parameters = {}) {
  assertCozeConfig(['COZE_PAT_TOKEN', 'COZE_WORKFLOW_ID']);

  const resp = await fetch(`${COZE_BASE}/v1/workflow/run`, {
    method: 'POST',
    headers: cozeHeaders(),
    body: JSON.stringify({
      workflow_id: WORKFLOW_ID,
      parameters
    })
  });

  const data = await readCozeJson(resp, 'Coze workflow failed');
  return data.data || data;
}

function getCozeStatus() {
  return {
    baseUrl: COZE_BASE,
    workspaceConfigured: Boolean(WORKSPACE_ID),
    botConfigured: Boolean(BOT_ID),
    workflowConfigured: Boolean(WORKFLOW_ID),
    tokenConfigured: Boolean(PAT_TOKEN),
    agents: Object.keys(AGENT_MAP)
  };
}

function cozeHeaders() {
  return {
    'Authorization': `Bearer ${PAT_TOKEN}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
}

async function readCozeJson(resp, prefix) {
  const text = await resp.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (err) {
    throw new Error(`${prefix}: invalid JSON response (${resp.status}) ${text.slice(0, 200)}`);
  }

  if (!resp.ok || (typeof data.code === 'number' && data.code !== 0)) {
    throw new Error(`${prefix}: ${data.msg || data.message || resp.statusText || resp.status}`);
  }

  return data;
}

async function pollCozeChat(conversationId, chatId) {
  if (!conversationId || !chatId) return {};

  const maxAttempts = Number(process.env.COZE_CHAT_POLL_ATTEMPTS || 80);
  const intervalMs = Number(process.env.COZE_CHAT_POLL_INTERVAL_MS || 500);
  let lastChat = {};

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await sleep(intervalMs);
    const resp = await fetch(
      `${COZE_BASE}/v3/chat/retrieve?conversation_id=${encodeURIComponent(conversationId)}&chat_id=${encodeURIComponent(chatId)}`,
      { method: 'POST', headers: cozeHeaders() }
    );
    const data = await readCozeJson(resp, 'Coze chat retrieve failed');
    lastChat = data.data || data;

    if (['completed', 'failed', 'requires_action'].includes(lastChat.status)) {
      break;
    }
  }

  return lastChat;
}

async function listCozeChatMessages(conversationId, chatId) {
  if (!conversationId || !chatId) return [];

  const resp = await fetch(
    `${COZE_BASE}/v3/chat/message/list?conversation_id=${encodeURIComponent(conversationId)}&chat_id=${encodeURIComponent(chatId)}`,
    { headers: cozeHeaders() }
  );
  const data = await readCozeJson(resp, 'Coze chat message list failed');
  return data.data || data.messages || [];
}

function pickAssistantReply(messages) {
  if (!Array.isArray(messages)) return '';

  const answer = messages.find(m => m.role === 'assistant' && (m.type === 'answer' || !m.type));
  const assistant = answer || messages.find(m => m.role === 'assistant');
  return assistant?.content || '';
}

function getChatFallbackReply(chat) {
  if (chat?.status === 'failed') {
    return chat.last_error?.msg || 'Coze Bot 执行失败，请检查 Bot 发布状态和工作流配置。';
  }

  if (chat?.status === 'requires_action') {
    return 'Coze Bot 需要额外工具调用处理，当前后端暂未实现工具回调。';
  }

  return 'Bot 已接收请求，但暂未在超时时间内返回文本结果。';
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function assertCozeConfig(names) {
  const missing = names.filter(name => {
    if (name === 'COZE_PAT_TOKEN') return !PAT_TOKEN;
    if (name === 'COZE_WORKSPACE_ID') return !WORKSPACE_ID;
    if (name === 'COZE_BOT_ID') return !BOT_ID;
    if (name === 'COZE_WORKFLOW_ID') return !WORKFLOW_ID;
    return !process.env[name];
  });

  if (missing.length) {
    throw new Error(`Missing Coze config: ${missing.join(', ')}`);
  }
}

module.exports = {
  callCozeChat,
  callCozeBot,
  runCozeWorkflow,
  getCozeStatus,
  AGENT_MAP
};
