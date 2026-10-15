import { describe, expect, it } from 'vitest';
import {
  parseAdInput,
  parseHttpUrl,
  parsePassword,
  parseSlot,
  parseUsername,
  parseWeight,
} from '../src/lib/admin-form';

/** 取一句结果里的值,不通过就当场断言失败(带出错误文案,便于定位)。 */
function valueOf<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  expect(result.ok, result.ok ? '' : result.error).toBe(true);
  return (result as { ok: true; value: T }).value;
}

function errorOf(result: { ok: true; value: unknown } | { ok: false; error: string }): string {
  expect(result.ok).toBe(false);
  return (result as { ok: false; error: string }).error;
}

describe('用户名', () => {
  it('接受常见的几种写法', () => {
    expect(valueOf(parseUsername('admin'))).toBe('admin');
    expect(valueOf(parseUsername('mouse_test'))).toBe('mouse_test');
    expect(valueOf(parseUsername('a-b-c'))).toBe('a-b-c');
    expect(valueOf(parseUsername('123'))).toBe('123');
  });

  it('两边空白会被去掉', () => {
    expect(valueOf(parseUsername('  admin  '))).toBe('admin');
  });

  it('太短、太长、字符不合法都拒绝', () => {
    expect(errorOf(parseUsername('ab'))).toContain('至少');
    expect(errorOf(parseUsername('a'.repeat(33)))).toContain('最多');
    // 三个字 —— 长度够,所以撞上的是字符集那一关(`'张三'` 只有两字,先撞长度)
    expect(errorOf(parseUsername('张三丰'))).toContain('字母');
    expect(errorOf(parseUsername('a b'))).toContain('字母');
    expect(errorOf(parseUsername('a@b'))).toContain('字母');
    expect(errorOf(parseUsername(''))).toContain('至少');
    expect(errorOf(parseUsername(undefined))).toContain('至少');
  });
});

describe('口令', () => {
  it('只校验长度,不要求大小写数字符号', () => {
    expect(valueOf(parsePassword('aaaaaaaa'))).toBe('aaaaaaaa');
    // 全是空格也算合法口令 —— 复杂度规则被刻意去掉了(见 admin-form.ts 的注释)
    expect(valueOf(parsePassword('        '))).toBe('        ');
  });

  it('两端的空白**不会被去掉** —— 密码里的空格是密码的一部分', () => {
    expect(valueOf(parsePassword('  abcdefgh  '))).toBe('  abcdefgh  ');
  });

  it('太短、太长都拒绝', () => {
    expect(errorOf(parsePassword('a'.repeat(7)))).toContain('至少');
    expect(errorOf(parsePassword('a'.repeat(73)))).toContain('最多');
    expect(errorOf(parsePassword(undefined))).toContain('至少');
  });
});

describe('槽位', () => {
  it('只认表里那两个', () => {
    expect(valueOf(parseSlot('home'))).toBe('home');
    expect(valueOf(parseSlot('toolbox'))).toBe('toolbox');
    expect(errorOf(parseSlot('sidebar'))).toContain('位置');
    expect(errorOf(parseSlot(undefined))).toContain('位置');
  });
});

describe('链接', () => {
  it('接受 http 与 https', () => {
    expect(valueOf(parseHttpUrl('https://example.com/a?b=1#c'))).toBe('https://example.com/a?b=1#c');
    expect(valueOf(parseHttpUrl('http://127.0.0.1:8080/'))).toBe('http://127.0.0.1:8080/');
  });

  it('协议大小写不敏感 —— 这是用 URL 解析而不是正则的好处', () => {
    expect(valueOf(parseHttpUrl('HTTPS://Example.COM/'))).toBe('https://example.com/');
  });

  it('存下来的是规范化之后的地址,不是敲进去的那一串', () => {
    // 裸域名补上路径斜杠
    expect(valueOf(parseHttpUrl('https://example.com'))).toBe('https://example.com/');
    // 路径里的空格被转义
    expect(valueOf(parseHttpUrl('https://example.com/a b'))).toBe('https://example.com/a%20b');
    // 已经规范的串原样通过
    expect(valueOf(parseHttpUrl('https://example.com/a?b=1#c'))).toBe('https://example.com/a?b=1#c');
  });

  it('拒绝 javascript: 与 data: —— 那是一个点击即执行的入口', () => {
    expect(errorOf(parseHttpUrl('javascript:alert(1)'))).toContain('http');
    expect(errorOf(parseHttpUrl('data:text/html,<script>'))).toContain('http');
    expect(errorOf(parseHttpUrl('vbscript:msgbox'))).toContain('http');
    expect(errorOf(parseHttpUrl('file:///c:/'))).toContain('http');
  });

  it('拒绝相对地址与空串', () => {
    expect(errorOf(parseHttpUrl('/mouse-repair/'))).toContain('http');
    expect(errorOf(parseHttpUrl('example.com'))).toContain('http');
    expect(errorOf(parseHttpUrl(''))).toContain('不能为空');
    expect(errorOf(parseHttpUrl('   '))).toContain('不能为空');
  });

  it('太长拒绝', () => {
    expect(errorOf(parseHttpUrl(`https://example.com/${'a'.repeat(500)}`))).toContain('最多');
  });
});

describe('权重', () => {
  it('接受 1 到 100 的整数', () => {
    expect(valueOf(parseWeight('1'))).toBe(1);
    expect(valueOf(parseWeight('100'))).toBe(100);
    expect(valueOf(parseWeight(' 7 '))).toBe(7);
  });

  it('**空串不是 0** —— 那是表单没填,而 0 的意思是"不参与轮播"', () => {
    // Number('') === 0 是 JS 的一个坑:不先挡空串的话,空输入会被静默当成权重 0
    expect(errorOf(parseWeight(''))).toContain('不能为空');
    expect(errorOf(parseWeight('   '))).toContain('不能为空');
    expect(errorOf(parseWeight(undefined))).toContain('不能为空');
  });

  it('0、负数、小数、非数字都拒绝', () => {
    expect(errorOf(parseWeight('0'))).toContain('至少');
    expect(errorOf(parseWeight('-1'))).toContain('至少');
    expect(errorOf(parseWeight('1.5'))).toContain('整数');
    expect(errorOf(parseWeight('abc'))).toContain('整数');
    expect(errorOf(parseWeight('NaN'))).toContain('整数');
    expect(errorOf(parseWeight('101'))).toContain('最多');
  });
});

describe('整条广告', () => {
  const good = {
    slot: 'home',
    title: '标题',
    body: '说明文字',
    url: 'https://example.com/',
    weight: '5',
  };

  it('全部合法时收成一条', () => {
    expect(valueOf(parseAdInput(good))).toEqual({
      slot: 'home',
      title: '标题',
      body: '说明文字',
      url: 'https://example.com/',
      weight: 5,
    });
  });

  it('按固定顺序报第一条错 —— 顺序随机会让人以为"改了 A 又错 B"', () => {
    // slot 与 title 同时坏掉,报的是 slot
    expect(errorOf(parseAdInput({ ...good, slot: 'x', title: '' }))).toContain('位置');
    // slot 好了,才轮到 title
    expect(errorOf(parseAdInput({ ...good, title: '' }))).toContain('标题');
    // title 好了,轮到 body
    expect(errorOf(parseAdInput({ ...good, body: '  ' }))).toContain('说明');
    // body 好了,轮到 url
    expect(errorOf(parseAdInput({ ...good, url: 'javascript:x' }))).toContain('http');
    // url 好了,轮到 weight
    expect(errorOf(parseAdInput({ ...good, weight: '0' }))).toContain('至少');
  });

  it('缺字段的表单不会被当成合法', () => {
    expect(errorOf(parseAdInput({}))).toContain('位置');
  });

  it('未知字段被丢掉,不会带进结果', () => {
    const parsed = valueOf(parseAdInput({ ...good, id: '99', active: '1' }));
    expect(Object.keys(parsed).sort()).toEqual(['body', 'slot', 'title', 'url', 'weight']);
  });
});
