import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type PersistentStateContextType = {
  /**
   * Adds state to be persisted.
   * If `state.state` is `undefined`, it is kept for this session but left out of the state passed to `onChange`.
   * @param hookId Unique ID for this hook instance
   * @param dhId The dhId of the component/panel.
   * @param state The state to persist. Needs to be JSON serializable.
   */
  addState: (hookId: string, dhId: string, state: PersistentState) => void;

  /**
   * Removes persisted state.
   * @param hookId Unique ID for this hook instance
   * @param dhId The dhId of the component/panel
   * @param type The state type to remove
   */
  removeState: (hookId: string, dhId: string, type: string) => void;

  /**
   * Deregisters a hook instance so it no longer owns any state.
   * This way we can accurately warn about multiple hooks trying to use the same (dhId, type) pair.
   * @param hookId Unique ID for this hook instance
   * @param dhId The dhId of the component/panel to deregister for
   * @param type The state type to deregister for
   */
  deregisterHook: (hookId: string, dhId: string, type: string) => void;

  /**
   * Gets the state for the given dhId and type.
   * Prepopulated with the initial state passed to the PersistentStateProvider.
   * @param dhId The dhId of the component/panel
   * @returns The iterator result containing the initial state value (state, version, type) if it exists.
   */
  getState: <S>(dhId: string, type: string) => PersistentState<S> | undefined;
};

/**
 * Context that holds methods to track the state of all calls to usePersistentState below this provider.
 */
export const PersistentStateContext =
  createContext<PersistentStateContextType | null>(null);
PersistentStateContext.displayName = 'PersistentStateContext';

export type PersistentState<S = unknown> = {
  state: S;
  version: number;
  type: string;
};

export type PersistentStateProviderProps = React.PropsWithChildren<{
  /**
   * The initial state of all calls to usePersistentState.
   * If there are more calls to usePersistentState than there are elements in this array,
   * the state initializer of the usePersistentState call will be used for the rest.
   */
  initialState: [PersistentStateKey, PersistentState][] | PersistentState[];

  /**
   * Called when the state changes.
   * The state is passed as an array of the values of all calls to usePersistentState.
   * The order of the values is the same as the order of the calls to usePersistentState.
   * @param state The state of all calls to usePersistentState.
   */
  onChange: (state: [PersistentStateKey, PersistentState][]) => void;

  /**
   * The dhId all saved keys are relative to, usually the id of the panel.
   * Keys within it are saved with it replaced by `.` to keep the saved state small.
   * Keys saved with the full dhId are still read.
   * Only read on mount, so change the provider's `key` along with it.
   */
  keyRoot?: string;
}>;

type PersistentStateKey = string;

const RELATIVE_KEY_ROOT = '.';

function makeKey(dhId: string, type: string): PersistentStateKey {
  return `${dhId}::${type}`;
}

/**
 * Replaces the key root at the start of a key with `.`
 * @param key The key to make relative
 * @param keyRoot The dhId the key is relative to
 * @returns The relative key, or the key unchanged if it isn't within the key root
 */
function makeRelativeKey(
  key: PersistentStateKey,
  keyRoot: string | undefined
): PersistentStateKey {
  if (
    keyRoot != null &&
    keyRoot !== '' &&
    (key.startsWith(`${keyRoot}/`) || key.startsWith(`${keyRoot}::`))
  ) {
    return `${RELATIVE_KEY_ROOT}${key.slice(keyRoot.length)}`;
  }
  return key;
}

function isRelativeKey(key: PersistentStateKey): boolean {
  return (
    key.startsWith(`${RELATIVE_KEY_ROOT}/`) ||
    key.startsWith(`${RELATIVE_KEY_ROOT}::`)
  );
}

/**
 * Replaces the `.` at the start of a relative key with the key root
 * @param key The key to expand
 * @param keyRoot The dhId the key is relative to
 * @returns The full key, or the key unchanged if it isn't relative
 */
function expandKey(
  key: PersistentStateKey,
  keyRoot: string | undefined
): PersistentStateKey {
  if (keyRoot != null && keyRoot !== '' && isRelativeKey(key)) {
    return `${keyRoot}${key.slice(RELATIVE_KEY_ROOT.length)}`;
  }
  return key;
}

/**
 * Gets the entries to persist. Entries with undefined state are left out because they
 * load the same as no entry. They stay in the map so a component that mounts later
 * in the session still loads them.
 */
function getPersistableEntries(
  stateMap: Map<PersistentStateKey, PersistentState>
): [PersistentStateKey, PersistentState][] {
  return [...stateMap.entries()].filter(
    ([, value]) => value?.state !== undefined
  );
}

/**
 * Tracks all calls to the usePersistentState hook below this provider.
 * Keeps track of the state based on dhId and state type, and calls onChange when the state changes.
 * Limit to one state per (dhId, type) pair.
 */
export function PersistentStateProvider(
  props: PersistentStateProviderProps
): JSX.Element {
  const { initialState, onChange, keyRoot, children } = props;

  const isMounted = useRef(true);
  useEffect(
    () => () => {
      isMounted.current = false;
    },
    []
  );

  const needsMigrationToMap = useRef(false);

  const [stateMap] = useState(() => {
    if (
      Array.isArray(initialState) &&
      initialState.flat().length === 2 * initialState.length
    ) {
      const map = new Map<string, PersistentState>();
      const relativelyLoadedKeys = new Set<PersistentStateKey>();
      (initialState as [string, PersistentState][]).forEach(([key, state]) => {
        const fullKey = expandKey(key, keyRoot);
        if (fullKey !== key) {
          relativelyLoadedKeys.add(fullKey);
        } else if (relativelyLoadedKeys.has(fullKey)) {
          // The relative key was saved more recently than the old absolute one
          return;
        }
        map.set(fullKey, state);
      });
      return map;
    }
    needsMigrationToMap.current = true;
    // Used to migrate from array to map
    return new Map<string, PersistentState>();
  });

  const emitChange = useCallback(() => {
    onChange(
      getPersistableEntries(stateMap).map(([key, state]) => [
        makeRelativeKey(key, keyRoot),
        state,
      ])
    );
  }, [keyRoot, onChange, stateMap]);

  // Track which hookId currently owns each (dhId, type) pair
  const hookOwnership = useRef(new Map<PersistentStateKey, string>());

  const addState = useCallback(
    (hookId: string, dhId: string, state: PersistentState) => {
      const { type } = state;
      const key = makeKey(dhId, type);
      const currentOwner = hookOwnership.current.get(key);

      if (currentOwner != null && currentOwner !== hookId) {
        throw new Error(
          `Detected multiple persistent states of type ${type} for dhId ${dhId}. Only one state per (dhId, type) pair is allowed.`
        );
      }

      hookOwnership.current.set(key, hookId);

      if (isMounted.current && stateMap.get(key) !== state) {
        stateMap.set(key, state);
        emitChange();
      }
    },
    [isMounted, emitChange, stateMap]
  );

  const initialStateIterator = useRef(initialState[Symbol.iterator]());

  // Keys that have already consumed an entry from legacy array state.
  // Tracked separately from stateMap because entries can be removed from stateMap,
  // and a remount must not consume another component's legacy entry.
  const migratedKeys = useRef(new Set<PersistentStateKey>());

  const getState = useCallback(
    <S,>(id: string, type: string): PersistentState<S> | undefined => {
      const key = makeKey(id, type);
      const state = stateMap.get(key);
      if (
        state == null &&
        needsMigrationToMap.current &&
        !migratedKeys.current.has(key)
      ) {
        migratedKeys.current.add(key);
        const { value } = initialStateIterator.current.next();
        const stateVal = value as PersistentState<S> | undefined;
        stateMap.set(key, stateVal as PersistentState);
        return stateVal;
      }

      return state as PersistentState<S> | undefined;
    },
    [stateMap]
  );

  const removeState = useCallback(
    (hookId: string, dhId: string, type: string) => {
      const key = makeKey(dhId, type);
      const currentOwner = hookOwnership.current.get(key);

      // Only remove if this hookId is the current owner
      if (currentOwner === hookId) {
        stateMap.delete(key);
        hookOwnership.current.delete(key);
        if (isMounted.current) {
          emitChange();
        }
      }
    },
    [isMounted, emitChange, stateMap]
  );

  const deregisterHook = useCallback(
    (hookId: string, dhId: string, type: string) => {
      const key = makeKey(dhId, type);
      const currentOwner = hookOwnership.current.get(key);

      // Only remove if this hookId is the current owner
      if (currentOwner === hookId) {
        hookOwnership.current.delete(key);
      }
    },
    []
  );

  const contextValue = useMemo(
    () => ({
      addState,
      removeState,
      deregisterHook,
      getState,
    }),
    [addState, getState, removeState, deregisterHook]
  );

  return (
    <PersistentStateContext.Provider value={contextValue}>
      {children}
    </PersistentStateContext.Provider>
  );
}
