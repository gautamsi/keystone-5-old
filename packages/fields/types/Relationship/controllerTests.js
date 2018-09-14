import Relationship from './';
import RelationshipController from './Controller';
import { buildController, normalise } from '../../tests/Controller.test';

export const name = 'Relationship';

export const controllerTests = () => {
  test('gqlQueryFragments', () => {
    const controller = buildController(
      {
        target: { type: Relationship, ref: 'Other' },
      },
      RelationshipController
    );

    expect(controller.gqlQueryFragments.map(normalise)).toEqual(
      ['target { id _label_ }'].map(normalise)
    );
  });
};
