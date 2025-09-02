export default (name, props = {}, isCloseAtNoContent = false) => {
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
      return isCloseAtNoContent ? `<${name} />` : `<${name}>`;
    }
    return `<${name}>${content ?? ''}</${name}>`;
  }
  let result = `<${name}`;
  for (let i = 0; i < attributes.length; i++) {
    const attrItem = attributes[i];
    result += ' ';
    result += attrItem.value == null ? attrItem.name : `${attrItem.name}="${attrItem.value}"`;
  }
  if (!hasContentProp) {
    return isCloseAtNoContent ? `${result} />` : `${result}>`;
  }
  result += '>';
  if (content != null) {
    result += content;
  }
  return `${result}</${name}>`;
};
