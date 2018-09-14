import Password from './';
import PasswordController from './Controller';
import { buildController } from '../../tests/Controller.test';

export const name = 'Float';

export const controllerTests = () => {
  test('gqlQueryFragments', () => {
    const controller = buildController({ target: { type: Password } }, PasswordController);

    expect(controller.gqlQueryFragments).toEqual(['target_is_set']);
  });
};
