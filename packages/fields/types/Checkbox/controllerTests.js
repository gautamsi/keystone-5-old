import Checkbox from './';
import CheckboxController from './Controller';
import { buildController } from '../../tests/Controller.test';

export const name = 'Checkbox';

export const controllerTests = () => {
  test('gqlQueryFragments', () => {
    const controller = buildController({ target: { type: Checkbox } }, CheckboxController);

    expect(controller.gqlQueryFragments).toEqual(['target']);
  });
};
