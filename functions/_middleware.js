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

  return new HTMLRewriter()
    .on('head', {
      element(element) {
        element.append(CLARITY_SNIPPET, { html: true });
      },
    })
    .transform(response);
}
