/*!
 * 给本站补上「跨域隔离」—— 为的是把浏览器的时间戳精度从 100µs 放回 5µs。
 *
 * 这是 `src/lib/capabilities.ts` 里 `COARSE_RESOLUTION_MS` 那条限制的正解:
 * 跨域隔离本来只能由响应头给出(`Cross-Origin-Opener-Policy: same-origin` +
 * `Cross-Origin-Embedder-Policy: require-corp`),而 **GitHub Pages 不允许自定义
 * 响应头**。于是换一条路:用 service worker 把**本站自己的**响应在到达页面之前
 * 补上这两个头,浏览器照认不误。
 *
 * ## 代价与边界(这些都要同时写进 CLAUDE.md,别当成没有)
 *
 * 1. **必须重新加载一次页面。** 隔离是文档在**导航时**定下的属性,当前这份文档
 *    拿不到,只能 reload —— 所以调用方要显式声明"本页需要隔离"(见
 *    `BaseLayout.astro` 的 `isolation` 属性),而不是全站无差别重载。
 *    注册本身不重载,所以从首页进来的用户走到回报率页时是**无缝**的。
 * 2. **service worker 是持久的。** 注册之后它会一直拦这个 scope 下的请求。
 *    这里刻意**不缓存任何东西**,只加两个响应头,把副作用压到最小。
 *    要撤掉它:把本文件换成一个调用 `self.registration.unregister()` 的版本 ——
 *    worker 脚本每次导航都会重新取,所以下次访问就能自己卸掉。
 * 3. **`require-corp` 会拦住不带 CORP / CORS 的跨源子资源。** 本站全部资源同源,
 *    现在没有影响;以后要挂第三方统计 / 字体 / CDN,必须先确认对方带 CORS 头
 *    (或给标签加 `crossorigin`),否则会被**静默**拦掉。
 * 4. **拿不到就没拿到。** 隐私模式、禁用了 service worker、或者非 HTTPS 的浏览器
 *    上,这里什么都不做,页面回到 100µs 并如实告警 —— 不假装成功。
 *
 * 机制参照 GuidoZuidhof/coi-serviceworker(MIT),这份是按本站需要重写的精简版:
 * 只碰同源响应、不缓存、不自带注册逻辑。
 */

// 浏览器把它当 service worker 加载时 `window` 是 undefined;若有人误把这个文件
// 当普通脚本引入页面,整段就是个空操作,不会报错。
if (typeof window === 'undefined') {
  self.addEventListener('install', () => {
    // 不等旧的 worker 退休:用户没必要为了一个响应头多等一个页面周期
    self.skipWaiting();
  });

  self.addEventListener('activate', (event) => {
    // 让**已经打开**的页面也归它管,否则要等下一次导航才生效
    event.waitUntil(self.clients.claim());
  });

  self.addEventListener('fetch', (event) => {
    const request = event.request;

    // 跨源请求一概不碰:COEP 只该由本站自己的响应声明,替别人的响应加头没有意义
    let url;
    try {
      url = new URL(request.url);
    } catch {
      return;
    }
    if (url.origin !== self.location.origin) return;

    // devtools 有时会发 only-if-cached 的请求,fetch() 对它会直接抛
    if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') return;

    event.respondWith(
      fetch(request).then((response) => {
        // 状态码 0 是不透明响应(跨源 no-cors 或重定向),头和体都读不到。
        // 包一层 Response 会把它变成损坏的响应,原样放行。
        if (response.status === 0) return response;

        const headers = new Headers(response.headers);
        headers.set('Cross-Origin-Opener-Policy', 'same-origin');
        headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }),
    );
  });
}
