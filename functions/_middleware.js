const PLAYER_LENS_PUBLIC_BASE = 'https://pro-baseball-watch-guide.com/player-lens';
const PROXY_REQUEST_HEADER = 'x-player-lens-proxy';

const CLARITY_PROJECT_ID = 'y5b8b6a2x5';

const CLARITY_SNIPPET = `<script type="text/javascript">
(function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");
</script>`;

function shouldSkip(pathname) {
  return /(^|\/)admin(?:\.html|-|\/|$)/.test(pathname)
    || /\/google[0-9a-z]+\.html$/i.test(pathname);
}

export async function onRequest(context) {
  const response = await context.next();
  const pathname = new URL(context.request.url).pathname;
  const contentType = response.headers.get('content-type') || '';

  if (shouldSkip(pathname) || !contentType.includes('text/html')) {
    return response;
  }

  // Keep this Pages project as the upstream for the blog proxy. Redirect
  // normal page visits to the blog, but never redirect the proxy itself.
  if (
    (context.request.method === 'GET' || context.request.method === 'HEAD') &&
    response.status === 200 &&
    context.request.headers.get(PROXY_REQUEST_HEADER) !== '1'
  ) {
    const url = new URL(context.request.url);
    return new Response(null, {
      status: 301,
      headers: {
        Location: `${PLAYER_LENS_PUBLIC_BASE}${url.pathname}${url.search}`,
        'Cache-Control': 'no-store',
      },
    });
  }

  const transformed = new HTMLRewriter()
    .on('head', {
      element(element) {
        element.append(CLARITY_SNIPPET, { html: true });
      },
    })
    .transform(response);

  // Pages Functions responses may not inherit _headers. The upstream remains
  // noindex; the blog proxy removes this header for the public copy.
  const headers = new Headers(transformed.headers);
  headers.set('X-Robots-Tag', 'noindex, follow');
  return new Response(transformed.body, {
    status: transformed.status,
    statusText: transformed.statusText,
    headers,
  });
}
