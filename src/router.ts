import type { InlinedRoute } from "./types";

export function generateRouterShim(routes: InlinedRoute[]): string {
  const routeMap: Record<string, { head: string; body: string }> = {};

  for (const route of routes) {
    const cleanPath = route.path === "/" ? "/" : route.path.replace(/\/$/, "");
    routeMap[cleanPath] = {
      head: route.headContent,
      body: route.bodyContent,
    };
  }

  const routeMapJson = JSON.stringify(routeMap);
  const routeMapBase64 = Buffer.from(routeMapJson).toString("base64");

  return `
(function() {
  const ROUTE_MAP_BASE64 = "${routeMapBase64}";
  let ROUTE_MAP = {};
  
  function b64DecodeUnicode(str) {
    return decodeURIComponent(atob(str).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
  }

  try {
    ROUTE_MAP = JSON.parse(b64DecodeUnicode(ROUTE_MAP_BASE64));
  } catch (e) {
    console.error("Failed to parse ROUTE_MAP", e);
    try {
      ROUTE_MAP = JSON.parse(window.atob(ROUTE_MAP_BASE64));
    } catch (e2) {
      console.error("Fallback parsing also failed", e2);
    }
  }

  let currentRoute = '/';
  let isInitialized = false;

  // Intercept Next.js chunk loading to prevent network requests
  if (typeof window !== 'undefined') {
    window.__NEXT_DATA__ = window.__NEXT_DATA__ || { props: { pageProps: {} }, page: "/", query: {}, buildId: "single-file" };
    // Disable automatic prefetching
    window.__NEXT_P = window.__NEXT_P || [];
  }

  function getHashPath() {
    let hash = window.location.hash.slice(1);
    if (!hash || hash === '') hash = '/';
    if (!hash.startsWith('/')) hash = '/' + hash;
    return hash;
  }

  function normalizePath(path) {
    if (!path) return '/';
    if (path === '/') return '/';
    return path.endsWith('/') ? path.slice(0, -1) : path;
  }

  function renderRoute(path, skipIfSame) {
    path = normalizePath(path);
    if (skipIfSame && path === currentRoute) return;
    
    const route = ROUTE_MAP[path];
    
    if (!route || !route.body) {
      console.warn('Route not found or empty:', path, '- available routes:', Object.keys(ROUTE_MAP));
      const notFoundRoute = ROUTE_MAP['/404'] || ROUTE_MAP['/_not-found'];
      if (notFoundRoute && notFoundRoute.body) {
        const rootEl = document.getElementById('__next') || document.body;
        rootEl.innerHTML = notFoundRoute.body;
      }
      return;
    }

    // Update title
    if (route.head) {
      const titleMatch = route.head.match(/<title[^>]*>([\\s\\S]*?)<\\/title>/i);
      if (titleMatch && titleMatch[1]) {
        document.title = titleMatch[1];
      }
    }

    const rootEl = document.getElementById('__next') || document.body;
    rootEl.innerHTML = route.body;
    currentRoute = path;
    
    // Re-execute scripts
    const scripts = rootEl.querySelectorAll('script');
    scripts.forEach(oldScript => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
      if (oldScript.src) {
        newScript.src = oldScript.src;
      } else {
        newScript.textContent = oldScript.textContent;
      }
      oldScript.parentNode.replaceChild(newScript, oldScript);
    });

    window.scrollTo(0, 0);
    document.dispatchEvent(new CustomEvent('routeChange', { detail: { path } }));
  }

  // Intercept pushState/replaceState
  const origPush = history.pushState.bind(history);
  const origReplace = history.replaceState.bind(history);

  history.pushState = function(state, title, url) {
    if (url && typeof url === 'string' && !url.startsWith('#') && !url.startsWith('http')) {
      window.location.hash = url;
      return;
    }
    return origPush(state, title, url);
  };

  history.replaceState = function(state, title, url) {
    if (url && typeof url === 'string' && !url.startsWith('#') && !url.startsWith('http')) {
      window.location.hash = url;
      return;
    }
    return origReplace(state, title, url);
  };

  document.addEventListener('click', (e) => {
    let target = e.target;
    while (target && target !== document) {
      if (target.tagName === 'A') break;
      target = target.parentElement;
    }
    
    if (target && target.tagName === 'A') {
      const href = target.getAttribute('href');
      if (href && href.startsWith('/') && !href.startsWith('//')) {
        const isExternal = target.target === '_blank' || target.hasAttribute('download');
        if (!isExternal) {
          e.preventDefault();
          window.location.hash = href;
        }
      }
    }
  }, true);

  window.addEventListener('hashchange', () => {
    const path = getHashPath();
    renderRoute(path, false);
  });

  function init() {
    if (isInitialized) return;
    isInitialized = true;
    const initialPath = getHashPath();
    if (initialPath !== '/') {
      renderRoute(initialPath, false);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 0);
  }

  window.__NEXT_SINGLE_FILE_ROUTER__ = {
    navigate: (path) => {
      window.location.hash = path;
    },
    getCurrentRoute: () => currentRoute,
    getRouteMap: () => ROUTE_MAP,
    renderRoute: renderRoute,
  };
})();
`;
}
