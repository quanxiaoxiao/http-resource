import _ from 'lodash';

import generateHtmlTag from './generateHtmlTag.mjs';

const createIndentedLine = (depth, content = '') => {
  if (!depth) {
    return `${content}\n`;
  }
  return `${'  '.repeat(depth)}${content}\n`;
};

const renderLines = (lines, depth = 0) => {
  return lines.reduce((result, line) => {
    if (Array.isArray(line)) {
      return result + renderLines(line, depth + 1);
    }
    return result + createIndentedLine(depth, line);
  }, '');
};

const createTagArray = (items, tagName, mapFn) => {
  return _.isEmpty(items) ? [] : [items.map(mapFn)];
};

export default ({
  title = '',
  documentAttributeList = [],
  metaList = [],
  linkList = [],
  styleList = [],
  scriptList = [],
  elemList = [],
  bodyAttributeList = [],
}) => {
  const result = [];
  const head = [];
  const body = [];

  result.push('<!DOCTYPE html>');
  result.push(generateHtmlTag('html', { attributes: documentAttributeList }));
  head.push(generateHtmlTag('head'));

  if (title) {
    head.push([generateHtmlTag('title', { content: title })]);
  }

  head.push(...createTagArray(
    metaList,
    'meta',
    (item) => generateHtmlTag('meta', { attributes: item.attributes }),
  ));

  head.push(...createTagArray(
    styleList,
    'style',
    (item) => generateHtmlTag('style', {
      content: item.content,
      attributes: item.attributes,
    }),
  ));

  head.push(...createTagArray(
    linkList,
    'link',
    (item) => generateHtmlTag('link', { attributes: item.attributes }),
  ));

  head.push('</head>');

  body.push(generateHtmlTag('body', { attributes: bodyAttributeList }));

  body.push(...createTagArray(
    elemList,
    'element',
    (item) => generateHtmlTag(item.name, {
      content: item.content,
      attributes: item.attributes,
    }),
  ));

  body.push(...createTagArray(
    scriptList,
    'script',
    (item) => generateHtmlTag('script', {
      content: item.content,
      attributes: item.attributes,
    }),
  ));
  body.push('</body>');
  result.push(head, body);
  return `${renderLines(result)}</html>`;
};
