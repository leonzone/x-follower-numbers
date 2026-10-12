(function () {
  'use strict';

  var MSG_SOURCE = 'x-follower-numbers';
  var BADGE_ATTR = 'data-xfn-badge';

  // 小写 screen_name -> { followers, name }
  var followersByHandle = new Map();

  var RESERVED_PATHS = new Set([
    'home', 'explore', 'notifications', 'messages', 'i', 'settings', 'search',
    'compose', 'bookmarks', 'lists', 'communities', 'premium', 'verified',
    'hashtag', 'about', 'help', 'login', 'logout', 'signup', 'tos', 'privacy',
    'jobs', 'download', 'follower_requests'
  ]);

  window.addEventListener('message', function (event) {
    if (event.source !== window) return;
    var data = event.data;
    if (!data || data.source !== MSG_SOURCE || !Array.isArray(data.users)) return;
    var changed = false;
    for (var i = 0; i < data.users.length; i++) {
      var user = data.users[i];
      if (!user || !user.screen_name || typeof user.followers_count !== 'number') continue;
      var key = user.screen_name.toLowerCase();
      var prev = followersByHandle.get(key);
      if (!prev || prev.followers !== user.followers_count) {
        followersByHandle.set(key, { followers: user.followers_count, name: user.name || '' });
        changed = true;
      }
    }
    if (changed) scheduleScan();
  });

  // 从用户名容器里的链接提取 handle，例如 href="/someone"
  function extractHandle(root) {
    var links = root.querySelectorAll('a[href^="/"]');
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href') || '';
      var match = href.match(/^\/([A-Za-z0-9_]{1,20})\/?$/);
      if (match && !RESERVED_PATHS.has(match[1].toLowerCase())) {
        return match[1].toLowerCase();
      }
    }
    return null;
  }

  // 中文计数：>= 1万 用「万」，>= 1亿 用「亿」，不足一万用千分位
  function formatFollowers(n) {
    if (n >= 1e8) return trimZero(n / 1e8) + '亿';
    if (n >= 1e4) return trimZero(n / 1e4) + '万';
    return n.toLocaleString('en-US');
  }

  function trimZero(v) {
    return (v >= 100 ? v.toFixed(0) : v.toFixed(1)).replace(/\.0$/, '');
  }

  // 挂载点：UserCell（关注/粉丝列表、推荐关注）把徽章放进显示名链接里，
  // 其他容器直接追加到元素末尾
  function findMountPoint(el) {
    if (el.getAttribute('data-testid') === 'UserCell') {
      var links = el.querySelectorAll('a[href^="/"]');
      for (var i = 0; i < links.length; i++) {
        var text = (links[i].textContent || '').trim();
        if (text && text.charAt(0) !== '@') {
          return links[i].firstElementChild || links[i];
        }
      }
      return null;
    }
    return el;
  }

  function addBadge(el, handle) {
    var info = followersByHandle.get(handle);
    if (!info) return;
    var mount = findMountPoint(el);
    if (!mount) return;
    var badge = document.createElement('span');
    badge.className = 'xfn-badge';
    badge.textContent = '粉丝 ' + formatFollowers(info.followers);
    badge.title = info.followers.toLocaleString('en-US') + ' 位粉丝';
    mount.appendChild(badge);
    el.setAttribute(BADGE_ATTR, '1');
  }

  function scan() {
    // User-Name：推文里的用户名区域
    // UserName：个人主页头部、悬停卡片里的用户名区域
    // UserCell：关注/粉丝列表、推荐关注里的用户卡片（X 已不再提供 User-Name）
    // HoverCard：悬停卡片整体（兜底）
    var selector = '[data-testid="User-Name"], [data-testid="UserName"], [data-testid="UserCell"], [data-testid="HoverCard"]';
    var elements = document.querySelectorAll(selector);
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      if (el.hasAttribute(BADGE_ATTR)) continue;
      var handle = extractHandle(el);
      // 个人主页头部的 UserName 里没有链接，handle 从 URL 取；
      // 悬停卡片里的 UserName 对应的是别人，不能用 URL 兜底
      if (!handle && el.getAttribute('data-testid') === 'UserName' &&
          !el.closest('[data-testid="HoverCard"]')) {
        var m = location.pathname.match(/^\/([A-Za-z0-9_]{1,20})(\/|$)/);
        if (m && !RESERVED_PATHS.has(m[1].toLowerCase())) handle = m[1].toLowerCase();
      }
      if (!handle || !followersByHandle.has(handle)) continue;
      addBadge(el, handle);
    }
  }

  var scanScheduled = false;
  function scheduleScan() {
    if (scanScheduled) return;
    scanScheduled = true;
    requestAnimationFrame(function () {
      scanScheduled = false;
      scan();
    });
  }

  var style = document.createElement('style');
  style.textContent =
    '.xfn-badge {' +
    '  display: inline-flex;' +
    '  align-items: center;' +
    '  margin-left: 6px;' +
    '  padding: 2px 6px;' +
    '  border-radius: 4px;' +
    '  background-color: rgba(29, 155, 240, 0.1);' +
    '  color: rgb(29, 155, 240);' +
    '  font-size: 13px;' +
    '  font-weight: 500;' +
    '  line-height: 16px;' +
    '  white-space: nowrap;' +
    '  font-family: inherit;' +
    '  text-decoration: none;' +
    '}';
  (document.head || document.documentElement).appendChild(style);

  var observer = new MutationObserver(scheduleScan);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  scan();
})();
