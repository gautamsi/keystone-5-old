import Integer from './';
import IntegerController from './Controller';
import { buildController } from '../../tests/Controller.test';

export const name = 'Integer';

export const controllerTests = () => {
  test('gqlQueryFragments', () => {
    const controller = buildController({ target: { type: Integer } }, IntegerController);

    expect(controller.gqlQueryFragments).toEqual(['target']);
  });
};
