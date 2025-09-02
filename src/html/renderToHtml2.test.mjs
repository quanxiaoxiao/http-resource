import assert from 'node:assert';
import { describe, test } from 'node:test';

import renderToHtml from './renderToHtml.mjs'; // 假设你的文件名

describe('HTML Generator Tests', () => {

  describe('基础功能测试', () => {
    test('生成最基本的HTML文档', () => {
      const result = renderToHtml({});

      assert.ok(result.includes('<!DOCTYPE html>'));
      assert.ok(result.includes('<html>'));
      assert.ok(result.includes('<head>'));
      assert.ok(result.includes('</head>'));
      assert.ok(result.includes('<body>'));
      assert.ok(result.includes('</body>'));
      assert.ok(result.includes('</html>'));
    });

    test('添加标题', () => {
      const result = renderToHtml({
        title: 'Test Page',
      });

      assert.ok(result.includes('<title>Test Page</title>'));
    });

    test('添加文档属性', () => {
      const result = renderToHtml({
        documentAttributeList: [{ name: 'lang', value: 'zh-CN' }],
      });

      assert.ok(result.includes('lang="zh-CN"'));
    });

    test('添加body属性', () => {
      const result = renderToHtml({
        bodyAttributeList: [{ name: 'class', value: 'main-body' }, { name: 'id', value: 'app' }],
      });

      assert.ok(result.includes('class="main-body"'));
      assert.ok(result.includes('id="app"'));
    });
  });

  describe('Meta标签测试', () => {
    test('添加单个meta标签', () => {
      const result = renderToHtml({
        metaList: [
          { attributes: [{ name: 'charset', value: 'UTF-8' }] },
        ],
      });

      assert.ok(result.includes('<meta charset="UTF-8" />'));
    });

    test('添加多个meta标签', () => {
      const result = renderToHtml({
        metaList: [
          { attributes: [{ name: 'charset', value: 'UTF-8' }] },
          { attributes: [{ name: 'name', value: 'viewport' }, { name: 'content', value: 'width=device-width, initial-scale=1' }] },
        ],
      });

      assert.ok(result.includes('<meta charset="UTF-8" />'));
      assert.ok(result.includes('name="viewport"'));
      assert.ok(result.includes('content="width=device-width, initial-scale=1"'));
    });

    test('空的metaList不应该添加meta标签', () => {
      const result = renderToHtml({
        metaList: [],
      });

      assert.ok(!result.includes('<meta'));
    });
  });

  describe('Link标签测试', () => {
    test('添加CSS链接', () => {
      const result = renderToHtml({
        linkList: [
          { attributes: [{ name: 'rel', value: 'stylesheet' }, { name: 'href', value: 'styles.css' }] },
        ],
      });

      assert.ok(result.includes('<link rel="stylesheet" href="styles.css" />'));
    });

    test('添加多个link标签', () => {
      const result = renderToHtml({
        linkList: [
          { attributes: [{ name: 'rel', value: 'stylesheet' }, { name: 'href', value: 'styles.css' }] },
          { attributes: [{ name: 'rel', value: 'icon' }, { name: 'href', value: 'favicon.ico' }] },
        ],
      });

      assert.ok(result.includes('rel="stylesheet"'));
      assert.ok(result.includes('rel="icon"'));
    });
  });

  describe('Style标签测试', () => {
    test('添加内联样式', () => {
      const result = renderToHtml({
        styleList: [
          { content: 'body { margin: 0; }', attributes: [] },
        ],
      });

      assert.ok(result.includes('<style>body { margin: 0; }</style>'));
    });

    test('添加带属性的样式', () => {
      const result = renderToHtml({
        styleList: [
          {
            content: '.test { color: red; }',
            attributes: [{ name: 'type', value: 'text/css' }],
          },
        ],
      });

      assert.ok(result.includes('<style type="text/css">.test { color: red; }</style>'));
    });
  });

  describe('Script标签测试', () => {
    test('添加内联脚本', () => {
      const result = renderToHtml({
        scriptList: [
          { content: 'console.log("Hello");', attributes: [] },
        ],
      });

      assert.ok(result.includes('<script>console.log("Hello");</script>'));
    });

    test('添加外部脚本', () => {
      const result = renderToHtml({
        scriptList: [
          { content: '', attributes: [{ name: 'src', value: 'app.js' }] },
        ],
      });

      assert.ok(result.includes('<script src="app.js"></script>'));
    });

    test('脚本应该在body结束前', () => {
      const result = renderToHtml({
        scriptList: [
          { content: 'console.log("test");', attributes: [] },
        ],
      });

      const scriptIndex = result.indexOf('<script>');
      const bodyEndIndex = result.indexOf('</body>');

      assert.ok(scriptIndex < bodyEndIndex);
      assert.ok(scriptIndex > -1);
    });
  });

  describe('Element标签测试', () => {
    test('添加简单元素', () => {
      const result = renderToHtml({
        elemList: [
          { name: 'h1', content: 'Hello World', attributes: [] },
        ],
      });

      assert.ok(result.includes('<h1>Hello World</h1>'));
    });

    test('添加带属性的元素', () => {
      const result = renderToHtml({
        elemList: [
          {
            name: 'div',
            content: 'Content',
            attributes: [{ name: 'class', value: 'container' }, { name: 'id', value: 'main' }],
          },
        ],
      });

      assert.ok(result.includes('<div class="container" id="main">Content</div>'));
    });

    test('添加多个元素', () => {
      const result = renderToHtml({
        elemList: [
          { name: 'h1', content: 'Title', attributes: [] },
          { name: 'p', content: 'Paragraph', attributes: [] },
        ],
      });

      assert.ok(result.includes('<h1>Title</h1>'));
      assert.ok(result.includes('<p>Paragraph</p>'));
    });
  });

  describe('复合功能测试', () => {
    test('生成完整的HTML页面', () => {
      const result = renderToHtml({
        title: 'Complete Page',
        documentAttributeList: [{ name: 'lang', value: 'en' }],
        metaList: [
          { attributes: [{ name: 'charset', value: 'UTF-8' }] },
        ],
        linkList: [
          { attributes: [{ name: 'rel', value: 'stylesheet' }, { name: 'href', value: 'style.css' }] },
        ],
        styleList: [
          { content: 'body { font-family: Arial; }', attributes: [] },
        ],
        elemList: [
          { name: 'h1', content: 'Welcome', attributes: [{ name: 'class', value: 'title' }] },
          { name: 'p', content: 'This is a paragraph.', attributes: [] },
        ],
        scriptList: [
          { content: 'console.log("Page loaded");', attributes: [] },
        ],
        bodyAttributeList: [{ name: 'class', value: 'main' }],
      });

      // 验证所有组件都存在
      assert.ok(result.includes('<!DOCTYPE html>'));
      assert.ok(result.includes('<title>Complete Page</title>'));
      assert.ok(result.includes('lang="en"'));
      assert.ok(result.includes('<meta charset="UTF-8" />'));
      assert.ok(result.includes('rel="stylesheet"'));
      assert.ok(result.includes('body { font-family: Arial; }'));
      assert.ok(result.includes('<h1 class="title">Welcome</h1>'));
      assert.ok(result.includes('<p>This is a paragraph.</p>'));
      assert.ok(result.includes('console.log("Page loaded");'));
      assert.ok(result.includes('<body class="main">'));
    });

    test('验证HTML结构顺序', () => {
      const result = renderToHtml({
        title: 'Order Test',
        metaList: [{ attributes: [{ charset: 'UTF-8' }] }],
        styleList: [{ content: 'body{}', attributes: [] }],
        linkList: [{ attributes: [{ rel: 'stylesheet' }, { href: 'test.css' }] }],
        elemList: [{ name: 'div', content: 'content', attributes: [] }],
        scriptList: [{ content: 'console.log("test");', attributes: [] }],
      });

      const positions = {
        doctype: result.indexOf('<!DOCTYPE html>'),
        html: result.indexOf('<html>'),
        head: result.indexOf('<head>'),
        title: result.indexOf('<title>'),
        meta: result.indexOf('<meta'),
        style: result.indexOf('<style>'),
        link: result.indexOf('<link'),
        headEnd: result.indexOf('</head>'),
        body: result.indexOf('<body>'),
        div: result.indexOf('<div>'),
        script: result.indexOf('<script>'),
        bodyEnd: result.indexOf('</body>'),
        htmlEnd: result.indexOf('</html>'),
      };

      // 验证顺序
      assert.ok(positions.doctype < positions.html);
      assert.ok(positions.html < positions.head);
      assert.ok(positions.head < positions.title);
      assert.ok(positions.title < positions.meta);
      assert.ok(positions.meta < positions.style);
      assert.ok(positions.style < positions.link);
      assert.ok(positions.link < positions.headEnd);
      assert.ok(positions.headEnd < positions.body);
      assert.ok(positions.body < positions.div);
      assert.ok(positions.div < positions.script);
      assert.ok(positions.script < positions.bodyEnd);
      assert.ok(positions.bodyEnd < positions.htmlEnd);
    });
  });

  describe('边界情况测试', () => {
    test('所有参数为空或默认值', () => {
      const result = renderToHtml({
        title: '',
        documentAttributeList: [],
        metaList: [],
        linkList: [],
        styleList: [],
        scriptList: [],
        elemList: [],
        bodyAttributeList: [],
      });

      assert.ok(result.includes('<!DOCTYPE html>'));
      assert.ok(result.includes('<html>'));
      assert.ok(result.includes('</html>'));
      assert.ok(!result.includes('<title></title>'));
    });

    test('undefined参数处理', () => {
      const result = renderToHtml({
        title: undefined,
        metaList: undefined,
        linkList: undefined,
      });

      assert.ok(typeof result === 'string');
      assert.ok(result.includes('<!DOCTYPE html>'));
    });

    test('null参数处理', () => {
      const result = renderToHtml({
        title: null,
        styleList: null,
        scriptList: null,
      });

      assert.ok(typeof result === 'string');
      assert.ok(result.includes('<html>'));
    });
  });

  describe('格式化和缩进测试', () => {
    test('验证输出包含换行符', () => {
      const result = renderToHtml({
        title: 'Test',
      });

      assert.ok(result.includes('\n'));
    });

    test('验证基本缩进结构', () => {
      const result = renderToHtml({
        elemList: [
          { name: 'div', content: 'test', attributes: [] },
        ],
      });

      // 检查是否有适当的缩进
      const lines = result.split('\n');
      const bodyLine = lines.find(line => line.trim() === '<body>');
      const divLine = lines.find(line => line.includes('<div>'));

      if (bodyLine && divLine) {
        const bodyIndex = lines.indexOf(bodyLine);
        const divIndex = lines.indexOf(divLine);

        if (bodyIndex < divIndex) {
          // div应该比body有更多的缩进
          const bodyIndent = bodyLine.length - bodyLine.trimStart().length;
          const divIndent = divLine.length - divLine.trimStart().length;
          assert.ok(divIndent > bodyIndent);
        }
      }
    });
  });
});
