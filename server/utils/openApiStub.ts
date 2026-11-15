/**
 * OpenAPI 3.1.0 spec skeleton builder (Point 21).
 */
export function buildOpenApiSpec(version: string, serverUrl: string) {
  return {
    openapi: '3.1.0',
    info: { title: 'White Caves Real Estate API', version },
    servers: [{ url: serverUrl }],
    paths: {},
  };
}
