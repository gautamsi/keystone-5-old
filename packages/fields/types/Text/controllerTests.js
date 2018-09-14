import Text from './';
import TextController from './Controller';
import { buildController } from '../../tests/Controller.test';

export const name = 'Text';

export const controllerTests = () => {
  test('gqlQueryFragments', () => {
    const controller = buildController({ target: { type: Text } }, TextController);

    expect(controller.gqlQueryFragments).toEqual(['target']);
  });
};
