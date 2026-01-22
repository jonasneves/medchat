import type { Message } from '../App';

interface ChatContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

function buildApiMessages(messages: Message[]): Array<{ role: string; content: string | ChatContent[] }> {
  return messages.map(msg => {
    if (msg.images && msg.images.length > 0) {
      const content: ChatContent[] = [];

      msg.images.forEach(img => {
        content.push({
          type: 'image_url',
          image_url: { url: img },
        });
      });

      if (msg.content) {
        content.push({ type: 'text', text: msg.content });
      }

      return { role: msg.role, content };
    }

    return { role: msg.role, content: msg.content };
  });
}

export async function streamChat(
  messages: Message[],
  onChunk: (chunk: string, isEmptyChunk?: boolean) => void,
  signal?: AbortSignal
): Promise<void> {
  const apiMessages = buildApiMessages(messages);

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: apiMessages,
      max_tokens: 1024,
      temperature: 0.7,
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `HTTP ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);

      if (data === '[DONE]') return;

      try {
        const parsed = JSON.parse(data);
        if (parsed.error) {
          throw new Error(parsed.error);
        }
        const content = parsed.choices?.[0]?.delta?.content;
        if (content !== undefined) {
          // Signal empty chunks (thinking end marker) vs actual content
          onChunk(content, content === '');
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }
}
