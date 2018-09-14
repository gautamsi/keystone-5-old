import CalendarDay from './';
import CalendarDayController from './Controller';
import { buildController } from '../../tests/Controller.test';

export const name = 'CalendarDay';

export const controllerTests = () => {
  test('gqlQueryFragments', () => {
    const controller = buildController({ target: { type: CalendarDay } }, CalendarDayController);

    expect(controller.gqlQueryFragments).toEqual(['target']);
  });
};
