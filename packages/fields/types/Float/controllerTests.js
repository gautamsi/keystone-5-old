import Float from './';
import FloatController from './Controller';
import { buildController } from '../../tests/Controller.test';

export const name = 'Float';

export const controllerTests = () => {
  test('gqlQueryFragments', () => {
    const controller = buildController({ target: { type: Float } }, FloatController);

    expect(controller.gqlQueryFragments).toEqual(['target']);
  });
};
