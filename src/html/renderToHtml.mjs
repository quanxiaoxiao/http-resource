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

const createTagArray = (items, mapFn) => {
  return _.isEmpty(items) ? [] : [items.map(mapFn)];
};

export default ({
  title = '',
  metaList = [],
  linkList = [],
  styleList = [],
  scriptList = [],
  elemList = [],
  documentAttributeList = [],
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
    (item) => generateHtmlTag(
      'meta',
      { attributes: item.attributes },
      true,
    ),
  ));

  head.push(...createTagArray(
    styleList,
    (item) => generateHtmlTag(
      'style',
      {
        content: item.content,
        attributes: item.attributes,
      },
      true,
    ),
  ));

  head.push(...createTagArray(
    linkList,
    (item) => generateHtmlTag(
      'link',
      { attributes: item.attributes },
      true,
    ),
  ));

  head.push('</head>');

  body.push(generateHtmlTag('body', { attributes: bodyAttributeList }));

  body.push(...createTagArray(
    elemList,
    (item) => generateHtmlTag(item.name, {
      content: item.content,
      attributes: item.attributes,
    }),
  ));

  body.push(...createTagArray(
    scriptList,
    (item) => generateHtmlTag('script', {
      content: item.content,
      attributes: item.attributes,
    }),
  ));

  body.push('</body>');

  result.push(head, body);

  return `${renderLines(result)}</html>`;
};
