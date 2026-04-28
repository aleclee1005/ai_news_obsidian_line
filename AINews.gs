// ============================================================
// AI News → LINE Group + Obsidian (GitHub) 每日归档
// 触发器：每天定时运行（建议早上9点）
// ============================================================

var GITHUB_TOKEN = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
var GITHUB_OWNER = 'aleclee1005';
var GITHUB_REPO  = 'obsidian-vault';
var GITHUB_PATH  = 'AI-News'; // vault 内的文件夹名

// RSS 新闻来源（3个专题新闻 + 3个官方博客 = 每天6条）
var NEWS_SOURCES = [
  // --- 专题新闻（每类1条）---
  { name: '企业AI导入', url: 'https://venturebeat.com/category/ai/feed/' },
  { name: '个人AI使用', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml' },
  { name: 'AI机器人',   url: 'https://techcrunch.com/category/robotics/feed/' },

  // --- 官方博客（每家1条）---
  { name: 'OpenAI Blog',   url: 'https://openai.com/blog/rss.xml' },
  { name: 'Google AI Blog', url: 'https://blog.google/technology/ai/rss/' },
  { name: 'MIT Tech Review AI', url: 'https://www.technologyreview.com/feed/' },
];

var MAX_ITEMS_PER_SOURCE = 1; // 每个来源取1条 → 合计6条/天

// ============================================================
// 主函数（绑定触发器）
// ============================================================
function sendDailyAINews() {
  var items = fetchAllNews();
  if (items.length === 0) {
    Logger.log('No news items fetched.');
    return;
  }

  var today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');

  // 去重：过滤掉已发送过的 URL
  var sent = getSentUrls();
  var fresh = items.filter(function(item) { return !sent[item.url]; });
  if (fresh.length === 0) {
    Logger.log('All items already sent.');
    return;
  }

  // 发送 LINE
  var lineMsg = buildLineMessage(fresh, today);
  sendLineMessage(lineMsg);

  // 存档到 Obsidian（GitHub）
  var markdown = buildMarkdown(fresh, today);
  saveToObsidian(markdown, today);

  // 记录已发送
  markAsSent(fresh);
}

// ============================================================
// 抓取 RSS
// ============================================================
function fetchAllNews() {
  var all = [];
  NEWS_SOURCES.forEach(function(source) {
    try {
      var res = UrlFetchApp.fetch(source.url, { muteHttpExceptions: true });
      if (res.getResponseCode() !== 200) return;
      var xml = res.getContentText();
      var items = parseRss(xml, source.name);
      all = all.concat(items.slice(0, MAX_ITEMS_PER_SOURCE));
    } catch(e) {
      Logger.log('Fetch error: ' + source.name + ' / ' + e);
    }
  });
  return all;
}

function parseRss(xml, sourceName) {
  var items = [];
  try {
    var doc = XmlService.parse(xml);
    var root = doc.getRootElement();
    var ns = root.getNamespace();

    // RSS 2.0
    var channels = root.getChildren('channel', ns);
    if (channels.length > 0) {
      channels[0].getChildren('item', ns).forEach(function(item) {
        var title = getChildText(item, 'title', ns);
        var link  = getChildText(item, 'link', ns);
        var desc  = getChildText(item, 'description', ns);
        if (title && link) items.push({ title: title, url: link, desc: cleanDesc(desc), source: sourceName });
      });
      return items;
    }

    // Atom
    var atomNs = XmlService.getNamespace('http://www.w3.org/2005/Atom');
    root.getChildren('entry', atomNs).forEach(function(entry) {
      var title = getChildText(entry, 'title', atomNs);
      var linkEl = entry.getChild('link', atomNs);
      var link = linkEl ? linkEl.getAttribute('href').getValue() : null;
      var desc = getChildText(entry, 'summary', atomNs) || getChildText(entry, 'content', atomNs);
      if (title && link) items.push({ title: title, url: link, desc: cleanDesc(desc), source: sourceName });
    });
  } catch(e) {
    Logger.log('Parse error: ' + sourceName + ' / ' + e);
  }
  return items;
}

function getChildText(el, name, ns) {
  var child = el.getChild(name, ns);
  return child ? child.getText() : '';
}

function cleanDesc(desc) {
  if (!desc) return '';
  return desc.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().substring(0, 100);
}

// ============================================================
// 组装 LINE Flex Message（卡片格式）
// ============================================================
function buildLineMessage(items, today) {
  var bubbles = items.map(function(item) {
    return {
      type: 'bubble',
      size: 'kilo',
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'text',
            text: '【' + item.source + '】',
            size: 'xs',
            color: '#888888'
          },
          {
            type: 'text',
            text: item.title,
            weight: 'bold',
            wrap: true,
            size: 'sm'
          },
          {
            type: 'text',
            text: item.desc ? item.desc + '...' : '',
            wrap: true,
            size: 'xs',
            color: '#aaaaaa'
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '阅读全文 →',
              uri: item.url
            },
            style: 'primary',
            height: 'sm',
            color: '#4A90D9'
          }
        ]
      }
    };
  });

  return {
    type: 'flex',
    altText: '🤖 AI News (' + today + ')',
    contents: {
      type: 'carousel',
      contents: bubbles
    }
  };
}

// ============================================================
// 组装 Markdown（存 Obsidian）
// ============================================================
function buildMarkdown(items, today) {
  var lines = [
    '---',
    'date: ' + today,
    'tags: [AI, news]',
    '---',
    '',
    '# AI News - ' + today,
    ''
  ];
  items.forEach(function(item, i) {
    lines.push('## ' + (i + 1) + '. ' + item.title);
    lines.push('**Source:** ' + item.source + '  ');
    lines.push('**Link:** ' + item.url + '  ');
    if (item.desc) lines.push('> ' + item.desc + '...');
    lines.push('');
  });
  return lines.join('\n');
}

// ============================================================
// 存档到 GitHub（Obsidian vault）
// ============================================================
function saveToObsidian(markdown, today) {
  var path = GITHUB_PATH + '/' + today + '.md';
  var url = 'https://api.github.com/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/contents/' + path;

  var payload = {
    message: 'AI News: ' + today,
    content: Utilities.base64Encode(markdown, Utilities.Charset.UTF_8)
  };

  // 文件若已存在需要提供 SHA
  try {
    var getRes = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { Authorization: 'token ' + GITHUB_TOKEN },
      muteHttpExceptions: true
    });
    if (getRes.getResponseCode() === 200) {
      var existing = JSON.parse(getRes.getContentText());
      payload.sha = existing.sha;
    }
  } catch(e) {}

  UrlFetchApp.fetch(url, {
    method: 'put',
    contentType: 'application/json',
    headers: { Authorization: 'token ' + GITHUB_TOKEN },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}

// ============================================================
// 发送 LINE Push Message
// ============================================================
function sendLineMessage(message) {
  var props = PropertiesService.getScriptProperties();
  var token   = props.getProperty('LINE_CHANNEL_ACCESS_TOKEN');
  var groupId = props.getProperty('LINE_GROUP_ID');

  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify({
      to: groupId,
      messages: [message]
    })
  });
}

// ============================================================
// 去重：用 PropertiesService 存已发送的 URL
// ============================================================
function getSentUrls() {
  var raw = PropertiesService.getScriptProperties().getProperty('SENT_URLS');
  return raw ? JSON.parse(raw) : {};
}

function markAsSent(items) {
  var sent = getSentUrls();
  items.forEach(function(item) { sent[item.url] = true; });
  // 只保留最近 500 条，防止超出存储限制
  var keys = Object.keys(sent);
  if (keys.length > 500) {
    var trimmed = {};
    keys.slice(keys.length - 500).forEach(function(k) { trimmed[k] = true; });
    sent = trimmed;
  }
  PropertiesService.getScriptProperties().setProperty('SENT_URLS', JSON.stringify(sent));
}
