import CloudinaryImage from './';
import FileController from './Controller';
import { buildController, normalise } from '../../tests/Controller.test';

export const name = 'CloudinaryImage';

export const controllerTests = () => {
  test('gqlQueryFragments', () => {
    const controller = buildController({ target: { type: CloudinaryImage } }, FileController);

    expect(controller.gqlQueryFragments.map(normalise)).toEqual(
      [
        'target { id path filename mimetype encoding publicUrlTransformed(transformation: {width: "120", crop: "limit"}) }',
      ].map(normalise)
    );
  });
};
