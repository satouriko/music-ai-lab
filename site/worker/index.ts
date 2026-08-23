import appRouter from 'vinext/server/app-router-entry';

interface WorkerEnv {
  ASSETS?: Fetcher;
}

const RSC_HEADER = 'RSC';
const RSC_SEARCH_PARAM = '_rsc';
const RSC_CONTENT_TYPE = 'text/x-component';
const RSC_COMPATIBILITY_HEADER = 'X-Vinext-RSC-Compatibility-Id';
const RSC_COMPATIBILITY_ID = process.env.__VINEXT_RSC_COMPATIBILITY_ID;

function toStaticRscPathname(pathname: string) {
  if (pathname === '/') return '/index.rsc';
  return `${pathname.replace(/\/$/, '')}.rsc`;
}

function toStaticDocumentPathname(pathname: string) {
  if (pathname === '/') return '/index.document.html';
  return `${pathname.replace(/\/$/, '')}.document.html`;
}

function withRscHeaders(response: Response) {
  const headers = new Headers(response.headers);
  headers.set('Content-Type', RSC_CONTENT_TYPE);
  if (RSC_COMPATIBILITY_ID) {
    headers.set(RSC_COMPATIBILITY_HEADER, RSC_COMPATIBILITY_ID);
  }
  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

const worker = {
  async fetch(request: Request, env: WorkerEnv, context: ExecutionContext) {
    if (!env?.ASSETS) return appRouter.fetch(request, env, context);

    const url = new URL(request.url);
    const isRscRequest =
      request.headers.get(RSC_HEADER) === '1'
      || url.searchParams.has(RSC_SEARCH_PARAM);

    if ((request.method === 'GET' || request.method === 'HEAD') && isRscRequest) {
      url.pathname = toStaticRscPathname(url.pathname);
      url.search = '';
      const response = await env.ASSETS.fetch(new Request(url, request));
      if (response.status !== 404) return withRscHeaders(response);
    }

    if ((request.method === 'GET' || request.method === 'HEAD') && !isRscRequest) {
      url.pathname = toStaticDocumentPathname(url.pathname);
      url.search = '';
      const response = await env.ASSETS.fetch(new Request(url, request));
      if (response.status !== 404) return response;
    }

    return env.ASSETS.fetch(request);
  },
};

export default worker;
