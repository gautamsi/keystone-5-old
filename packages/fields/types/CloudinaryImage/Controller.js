import FieldController from '../../Controller';

export default class FileController extends FieldController {
  get gqlQueryFragments() {
    return [
      `
    ${this.path} {
       id
       path
       filename
       mimetype
       encoding
       publicUrlTransformed(transformation: { width: "120" crop: "limit" })
    }
  `,
    ];
  }
}
