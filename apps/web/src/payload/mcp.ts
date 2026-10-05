import { mcpPlugin as payloadMcpPlugin } from '@payloadcms/plugin-mcp';
import type { PayloadHandler, Plugin } from 'payload';

/**
 * From boraan. The MCP endpoint returns its (SSE) response as soon as the stream opens and runs
 * the tool while the body streams. Next.js executes a route handler's revalidations
 * (`revalidatePath` and `revalidateTag`, e.g. from `revalidateSiteAfterChange`) when the handler
 * returns, so those called during the tool call were dropped silently. Reading the whole response
 * first lets the tool finish within the handler. Payload's tools don't stream anything else.
 */
export const awaitResponseBody =
  (handler: PayloadHandler): PayloadHandler =>
  async (request) => {
    const response = await handler(request);
    return new Response(await response.arrayBuffer(), response);
  };

/** `@payloadcms/plugin-mcp`, which revalidates changes made through its tools */
export const mcpPlugin =
  (options: Parameters<typeof payloadMcpPlugin>[0]): Plugin =>
  async (incomingConfig) => {
    const config = await payloadMcpPlugin(options)(incomingConfig);

    return {
      ...config,
      endpoints: config.endpoints?.map((endpoint) =>
        endpoint.path === '/mcp' && endpoint.method === 'post'
          ? { ...endpoint, handler: awaitResponseBody(endpoint.handler) }
          : endpoint,
      ),
    };
  };
