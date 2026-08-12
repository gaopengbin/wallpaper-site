export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const path = url.pathname.replace(/^\/img/, '');
  const target = `https://haowallpaper.com/link/common/file${path}${url.search}`;

  const response = await fetch(target, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Referer': 'https://haowallpaper.com/',
    },
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
    },
  });
};
