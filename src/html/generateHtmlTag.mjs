export default (name, props = {}) => {
  const {
    attributes,
    content,
  } = props;
  if (!name) {
    return '';
  }

  const hasContentProp = Object.hasOwnProperty.call(props, 'content');
  if (!attributes || attributes.length === 0) {
    if (!hasContentProp) {
      return `<${name}>`;
    }
    return `<${name}>${content ?? ''}</${name}>`;
  }
  let result = `<${name}`;
  for (let i = 0; i < attributes.length; i++) {
    const attrItem = attributes[i];
    result += ' ';
    result += attrItem.value == null ? attrItem.name : `${attrItem.name}="${attrItem.value}"`;
  }
  result += '>';
  if (hasContentProp) {
    if (content != null) {
      result += content;
    }
    result += `</${name}>`;
  }
  return result;
};
