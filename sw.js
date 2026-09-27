// Kho Cơ Điện · 机电仓库 — cho phép mở app khi mất mạng.
// Tải file này lên GitHub cùng thư mục với index.html (không cần sửa gì).
//  - Trang app: lấy bản mới trên mạng; mạng chậm quá 6 giây hoặc mất mạng thì mở bản đã lưu.
//  - Thư viện quét mã, tạo QR, phông chữ: lưu lại để dùng khi mất mạng.
//  - Không đụng tới lệnh gửi lên máy chủ Google (app tự lo hàng chờ gửi).
const CACHE = 'kho-v1.2';
const LIBS = [
  'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js',
  'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js'
];
const CDN = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    try { await c.add(new Request('./', { cache: 'reload' })); } catch (err) { /* thử lại lần mở sau */ }
    await Promise.all(LIBS.map(u => c.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

function isAppPage(url) {
  const scope = new URL(self.registration.scope);
  return url.origin === scope.origin && (url.pathname === scope.pathname || url.pathname === scope.pathname + 'index.html');
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (req.mode === 'navigate' && isAppPage(url)) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const net = fetch(req, { cache: 'no-cache' }).then(res => {
        if (res && res.ok) c.put('./', res.clone());
        return res;
      });
      e.waitUntil(net.catch(() => {}));
      const hetGio = new Promise(resolve => setTimeout(resolve, 6000, null));
      let res = null;
      try { res = await Promise.race([net, hetGio]); } catch (err) { res = null; }
      if (res && res.ok) return res;
      const luu = await c.match('./');
      if (luu) return luu;
      try { return res || await net; } catch (err) { return Response.error(); }
    })());
    return;
  }

  if (CDN.includes(url.hostname)) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone());
      return res;
    })());
  }
});
