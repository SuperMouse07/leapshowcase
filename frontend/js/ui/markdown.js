/**
 * ui/markdown.js · 轻量 Markdown 渲染器（无第三方依赖）
 * ------------------------------------------------------------
 * 安全策略：先对原文全量 HTML 转义，再做 Markdown 替换；
 * 链接仅放行 http/https 协议，杜绝 XSS 注入。
 * 支持：# / ## / ### 标题，**加粗**，*斜体*，`行内代码`，
 * [链接](https://…)，- / * / • 无序列表，1. 有序列表，段落与换行。
 */
import { escapeHtml } from '../core/dom.js';

/* 行内语法：代码 → 加粗 → 斜体 → 链接（顺序保证互不干扰） */
function inline(s) {
  let t = s;
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  t = t.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s&)]+(?:&amp;[^\s&)]+)*)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  return t;
}

/** 将多行纯文本/Markdown 转为安全 HTML（外层包 .md 便于样式定位） */
export function renderMarkdown(text) {
  const lines = String(text ?? '').replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let para = [];
  let listTag = null; // 'ul' | 'ol' | null

  const flushPara = () => {
    if (para.length) {
      html.push(`<p>${para.map(inline).join('<br>')}</p>`);
      para = [];
    }
  };
  const closeList = () => {
    if (listTag) {
      html.push(`</${listTag}>`);
      listTag = null;
    }
  };

  for (const raw of lines) {
    const line = escapeHtml(raw);
    const trimmed = line.trim();

    if (!trimmed) {
      flushPara();
      closeList();
      continue;
    }

    const h = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (h) {
      flushPara();
      closeList();
      const level = h[1].length + 3; // # → h4，## → h5，### → h6
      html.push(`<h${level}>${inline(h[2])}</h${level}>`);
      continue;
    }

    const ul = trimmed.match(/^[-*•]\s+(.+)$/);
    if (ul) {
      flushPara();
      if (listTag !== 'ul') {
        closeList();
        html.push('<ul>');
        listTag = 'ul';
      }
      html.push(`<li>${inline(ul[1])}</li>`);
      continue;
    }

    const ol = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (ol) {
      flushPara();
      if (listTag !== 'ol') {
        closeList();
        html.push('<ol>');
        listTag = 'ol';
      }
      html.push(`<li>${inline(ol[1])}</li>`);
      continue;
    }

    closeList();
    para.push(trimmed);
  }
  flushPara();
  closeList();
  return `<div class="md">${html.join('')}</div>`;
}
