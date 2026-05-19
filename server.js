require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const path = require('path');
const fs = require('fs');
const Anthropic = require('@anthropic-ai/sdk');
const { Database } = require('node-sqlite3-wasm');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure db directory exists
const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

// Initialize SQLite
const db = new Database(path.join(dbDir, 'vocab.db'));
db.run(`
  CREATE TABLE IF NOT EXISTS vocab (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT NOT NULL,
    reading TEXT,
    type TEXT,
    meaning TEXT,
    example TEXT,
    example_zh TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_word ON vocab(word)`);

// DB helper wrappers
function dbRun(sql, params) {
  return db.run(sql, params || []);
}

function dbAll(sql, params) {
  return db.all(sql, params || []);
}

// Anthropic client
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// System prompts
const JSON_INSTRUCTION_JA = `
翻译完成后，输出分隔符 ###JSON### 然后紧接着输出一个JSON对象（不要用markdown代码块包裹，不要有多余文字）：
{"vocab":[{"word":"日文单词","reading":"假名读音","type":"名词|动词|形容词|副词|敬語|其他","meaning":"中文释义","example":"日文例句","example_zh":"例句中文翻译"}],"grammar":[{"point":"语法名称","explanation":"中文说明","example":"日文例句"}]}
vocab 列出3到6个核心日语词汇，grammar 列出2到3个语法要点。所有字符串值不得包含换行符，用\\n代替。`;

const JSON_INSTRUCTION_EN = `
After the translation, output the separator ###JSON### then immediately output a JSON object (no markdown code block, no extra text):
{"vocab":[{"word":"English word","reading":"","type":"noun|verb|adjective|adverb|other","meaning":"中文释义","example":"English example sentence","example_zh":"例句中文翻译"}],"grammar":[{"point":"Grammar/expression point","explanation":"中文说明","example":"English example sentence"}]}
vocab: 3-6 key English words or phrases. grammar: 2-3 grammar or expression notes. No newlines inside string values.`;

const systemPrompts = {
  'zh-ja-normal': `你是一位专业的中日翻译。请将用户输入的中文翻译成日文，使用ですます体（丁寧語），语气自然、亲切，像朋友之间礼貌地交谈，不需要使用复杂的敬语表达。不要在翻译部分加任何说明。${JSON_INSTRUCTION_JA}`,

  'zh-ja-business': `你是一位专业的中日翻译，擅长商务场合的正式表达。请将用户输入的中文翻译成日文，使用严格规范的敬语（尊敬語・謙譲語・丁寧語），措辞正式、得体，适合商务邮件、会议及正式场合使用。不要在翻译部分加任何说明。${JSON_INSTRUCTION_JA}`,

  'ja-zh': `你是一位专业的日中翻译。请将用户输入的日文准确翻译成中文，保持原文语气和风格。直接输出翻译结果，不要添加任何解释或额外说明。`,

  'zh-en-normal': `You are a professional Chinese-English translator. Translate the user's Chinese text into natural, friendly English — clear and conversational, as if speaking to a friend. Do not add any explanation in the translation part.${JSON_INSTRUCTION_EN}`,

  'zh-en-business': `You are a professional Chinese-English translator specializing in formal business communication. Translate the user's Chinese text into polished, formal English suitable for business emails, official documents, and professional settings. Do not add any explanation in the translation part.${JSON_INSTRUCTION_EN}`,

  'en-zh': `你是一位专业的英中翻译。请将用户输入的英文准确翻译成中文，保持原文语气和风格。直接输出翻译结果，不要添加任何解释或额外说明。`
};

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Translation endpoint with SSE streaming
app.post('/api/translate', async (req, res) => {
  const { text, direction, style } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'text is required' });
  }
  if (!['zh-ja', 'ja-zh', 'zh-en', 'en-zh'].includes(direction)) {
    return res.status(400).json({ error: 'invalid direction' });
  }

  let promptKey;
  if (direction === 'zh-ja') {
    promptKey = style === 'business' ? 'zh-ja-business' : 'zh-ja-normal';
  } else if (direction === 'zh-en') {
    promptKey = style === 'business' ? 'zh-en-business' : 'zh-en-normal';
  } else if (direction === 'ja-zh') {
    promptKey = 'ja-zh';
  } else {
    promptKey = 'en-zh';
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      temperature: 0.3,
      system: systemPrompts[promptKey],
      messages: [{ role: 'user', content: text.trim() }],
    });

    // Extract text chunks from raw SSE events (SDK 0.96+)
    function textChunks(stream) {
      return (async function* () {
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta?.type === 'text_delta'
          ) {
            yield event.delta.text;
          }
        }
      })();
    }

    const isReverse = direction === 'ja-zh' || direction === 'en-zh';
    if (isReverse) {
      for await (const chunk of textChunks(stream)) {
        send({ type: 'char', char: chunk });
      }
    } else {
      const SEP = '###JSON###';
      let preBuffer = '';
      let jsonBuffer = '';
      let separatorFound = false;

      for await (const chunk of textChunks(stream)) {
        if (separatorFound) {
          jsonBuffer += chunk;
          continue;
        }

        preBuffer += chunk;
        const sepIdx = preBuffer.indexOf(SEP);

        if (sepIdx !== -1) {
          separatorFound = true;
          const translationPart = preBuffer.substring(0, sepIdx).trim();
          jsonBuffer = preBuffer.substring(sepIdx + SEP.length);
          preBuffer = '';
          if (translationPart) send({ type: 'char', char: translationPart });
        } else {
          const safeCutoff = preBuffer.length - (SEP.length - 1);
          if (safeCutoff > 0) {
            send({ type: 'char', char: preBuffer.substring(0, safeCutoff) });
            preBuffer = preBuffer.substring(safeCutoff);
          }
        }
      }

      if (!separatorFound && preBuffer.trim()) {
        send({ type: 'char', char: preBuffer.trim() });
      }

      if (!separatorFound) {
        console.log('[warn] separator ###JSON### not found in response');
      }

      if (separatorFound && jsonBuffer.trim()) {
        try {
          let jsonStr = jsonBuffer.trim();
          // 剥除 markdown 代码块（```json ... ``` 或 ``` ... ```）
          jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
          // 提取第一个完整的 JSON 对象（防止尾部有多余文字）
          const m = jsonStr.match(/\{[\s\S]*\}/);
          if (m) jsonStr = m[0];
          const parsed = JSON.parse(jsonStr);
          console.log('[vocab]', parsed.vocab?.length, '[grammar]', parsed.grammar?.length);
          if (Array.isArray(parsed.vocab) && parsed.vocab.length > 0) {
            send({ type: 'vocab', data: parsed.vocab });
          }
          if (Array.isArray(parsed.grammar) && parsed.grammar.length > 0) {
            send({ type: 'grammar', data: parsed.grammar });
          }
        } catch (e) {
          console.error('JSON parse error:', e.message, '\nRaw:', jsonBuffer.trim().slice(0, 200));
        }
      }
    }

    send({ type: 'done' });
  } catch (err) {
    console.error('Translation error:', err.message);
    send({ type: 'error', message: err.message });
  }

  res.end();
});

// Save vocab word
app.post('/api/vocab/save', (req, res) => {
  const { word, reading, type, meaning, example, example_zh } = req.body;
  if (!word) return res.status(400).json({ error: 'word is required' });

  try {
    const result = dbRun(
      `INSERT OR IGNORE INTO vocab (word, reading, type, meaning, example, example_zh)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [word, reading || '', type || '', meaning || '', example || '', example_zh || '']
    );
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List vocab
app.get('/api/vocab/list', (_req, res) => {
  try {
    const rows = dbAll(`SELECT * FROM vocab ORDER BY created_at DESC`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete vocab
app.delete('/api/vocab/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'invalid id' });

  try {
    dbRun(`DELETE FROM vocab WHERE id = ?`, [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`中日翻译学习工具已启动: http://localhost:${PORT}`);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception (server continues):', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection (server continues):', reason?.message || reason);
});
