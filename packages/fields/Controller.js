const { gql } = require('apollo-server-express');

export default class FieldController {
  constructor(config, list, adminMeta) {
    this.config = config;
    this.label = config.label;
    this.path = config.path;
    this.type = config.type;
    this.list = list;
    this.adminMeta = adminMeta;
  }

  get gqlQueryFragments() {
    const { gqlOutputFields, gqlAuxTypes } = this.adminMeta;
    return gqlOutputFields.map(field => {
      const [name, type] = field.split(':');
      let subFields = '';
      if (gqlAuxTypes.length) {
        const gqlType = gql(gqlAuxTypes.join('\n')).definitions.reduce(
          (acc, d) => ({ [d.name.value]: d, ...acc }),
          {}
        )[type.trim()];
        if (gqlType.kind === 'ObjectTypeDefinition') {
          subFields = `{ ${gqlType.fields.map(f => f.name.value).join('\n')} }`;
        }
      }
      return `${name}${subFields}`;
    });
  }

  getValue = data => data[this.config.path] || '';
  getInitialData = () => this.config.defaultValue || '';
}
