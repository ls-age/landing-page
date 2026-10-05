import { describe, expect, test } from 'bun:test';
import type { PayloadRequest } from 'payload';
import { awaitResponseBody } from './mcp';

// Like the MCP endpoint for notifications, which have no response
const acceptNotification = async () => new Response(undefined, { status: 202 });

describe('awaitResponseBody', () => {
  test('returns once the streamed body is complete', async () => {
    let toolFinished = false;

    // Like the MCP endpoint: the response is returned first, the tool runs while the body streams
    const handler = async () =>
      new Response(
        new ReadableStream({
          async start(controller) {
            await new Promise((resolve) => setTimeout(resolve, 10));
            toolFinished = true;
            controller.enqueue(new TextEncoder().encode('data: {"result":{}}\n\n'));
            controller.close();
          },
        }),
        { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
      );

    const response = await awaitResponseBody(handler)({} as PayloadRequest);

    expect(toolFinished).toBe(true);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    expect(await response.text()).toBe('data: {"result":{}}\n\n');
  });

  test('keeps empty responses', async () => {
    const response = await awaitResponseBody(acceptNotification)({} as PayloadRequest);

    expect(response.status).toBe(202);
    expect(await response.text()).toBe('');
  });
});
