(function () {
  'use strict';

  var MSG_SOURCE = 'x-follower-numbers';
  var API_PATTERN = /\/graphql\/|\/i\/api\//;

  // 递归遍历响应 JSON，找出所有带粉丝数的用户对象。
  // 现行结构：{ core: { screen_name, name }, relationship_counts: { followers } }
  // 历史结构：{ core: { screen_name } | legacy: { screen_name }, legacy: { followers_count } }
  function collectUsers(node, out) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (var i = 0; i < node.length; i++) collectUsers(node[i], out);
      return;
    }
    var core = node.core;
    var legacy = node.legacy;
    var relCounts = node.relationship_counts;
    var screenName = (core && core.screen_name) || (legacy && legacy.screen_name);
    var followers = null;
    if (relCounts && typeof relCounts.followers === 'number') {
      followers = relCounts.followers;
    } else if (legacy && typeof legacy.followers_count === 'number') {
      followers = legacy.followers_count;
    }
    if (typeof screenName === 'string' && screenName && followers !== null) {
      out.push({
        screen_name: screenName,
        name: (core && core.name) || (legacy && legacy.name) || '',
        followers_count: followers
      });
    }
    for (var key in node) {
      var value = node[key];
      if (value && typeof value === 'object') collectUsers(value, out);
    }
  }

  function handleResponseData(data) {
    try {
      var users = [];
      collectUsers(data, users);
      if (users.length > 0) {
        window.postMessage({ source: MSG_SOURCE, users: users }, window.location.origin);
      }
    } catch (e) { /* 忽略解析异常 */ }
  }

  // 拦截 fetch（X 的主要请求方式）
  var originalFetch = window.fetch;
  window.fetch = function () {
    var url = typeof arguments[0] === 'string' ? arguments[0]
      : (arguments[0] && arguments[0].url) || '';
    var shouldInspect = API_PATTERN.test(url);
    return originalFetch.apply(this, arguments).then(function (response) {
      if (shouldInspect) {
        response.clone().json().then(handleResponseData).catch(function () {});
      }
      return response;
    });
  };

  // 拦截 XMLHttpRequest 作为兜底
  var originalOpen = XMLHttpRequest.prototype.open;
  var originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__xfnUrl = url;
    return originalOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function () {
    if (API_PATTERN.test(this.__xfnUrl || '')) {
      this.addEventListener('load', function () {
        try {
          handleResponseData(JSON.parse(this.responseText));
        } catch (e) { /* 忽略解析异常 */ }
      });
    }
    return originalSend.apply(this, arguments);
  };
})();
