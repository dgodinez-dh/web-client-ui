import React from 'react';
import { render, screen } from '@testing-library/react';
import type { Container, EventEmitter } from '@deephaven/golden-layout';
import { TestUtils } from '@deephaven/test-utils';
import DashboardPanelWrapper from './DashboardPanelWrapper';
import { FiberProvider } from './useFiber';
import { PanelIdContext } from './usePanelId';
import usePersistentState from './usePersistentState';

function TestComponent() {
  const [state] = usePersistentState('default', { type: 'test', version: 1 });
  return <span>{state}</span>;
}

function renderWrapper(persistedState?: unknown) {
  const glContainer = TestUtils.createMockProxy<Container>({
    getConfig: jest.fn(() => ({ persistedState })),
    setPersistedState: jest.fn(),
  });
  render(
    <FiberProvider>
      <PanelIdContext.Provider value="test-panel">
        <DashboardPanelWrapper
          glContainer={glContainer}
          glEventHub={TestUtils.createMockProxy<EventEmitter>()}
        >
          <TestComponent />
        </DashboardPanelWrapper>
      </PanelIdContext.Provider>
    </FiberProvider>
  );
  return glContainer;
}

it('saves state keys relative to the panel', () => {
  const glContainer = renderWrapper();

  expect(glContainer.setPersistedState).toHaveBeenLastCalledWith([
    ['.::test', expect.objectContaining({ state: 'default' })],
  ]);
});

it('loads state saved with the full panel id', () => {
  renderWrapper([
    ['test-panel::test', { type: 'test', version: 1, state: 'saved' }],
  ]);

  expect(screen.getByText('saved')).toBeInTheDocument();
});
