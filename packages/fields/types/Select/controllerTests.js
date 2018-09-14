import Select from './';
import SelectController from './Controller';
import { buildController } from '../../tests/Controller.test';

export const name = 'Select';

export const controllerTests = () => {
  test('gqlQueryFragments', () => {
    const controller = buildController(
      { target: { type: Select, options: ['a', 'b'] } },
      SelectController
    );

    expect(controller.gqlQueryFragments).toEqual(['target']);
  });
};
