export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const path = url.pathname.replace(/^\/nas/, '');

  // Only allow: /pc/{id}.{ext} or /mobile/{id}.{ext}
  // id = numeric string, ext = jpg|png|webp|mp4
  if (!/^\/(pc|mobile)\/\d+\.(jpg|png|webp|mp4)$/.test(path)) {
    return new Response('Not Found', { status: 404 });
  }

  const target = `https://wp.gpb.cc${path}`;
  const response = await fetch(target);

  return new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
      'Content-Length': response.headers.get('Content-Length') || '',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
