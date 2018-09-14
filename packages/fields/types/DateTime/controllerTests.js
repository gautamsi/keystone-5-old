import DateTime from './';
import DateTimeController from './Controller';
import { buildController } from '../../tests/Controller.test';

export const name = 'DateTime';

export const controllerTests = () => {
  test('gqlQueryFragments', () => {
    const controller = buildController({ target: { type: DateTime } }, DateTimeController);

    expect(controller.gqlQueryFragments).toEqual(['target']);
  });
};
