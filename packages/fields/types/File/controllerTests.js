import File from './';
import FileController from './Controller';
import { buildController, normalise } from '../../tests/Controller.test';

export const name = 'File';

export const controllerTests = () => {
  test('gqlQueryFragments', () => {
    const controller = buildController({ target: { type: File } }, FileController);

    expect(controller.gqlQueryFragments.map(normalise)).toEqual(
      ['target { id path filename mimetype encoding publicUrl }'].map(normalise)
    );
  });
};
