import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Log from '@deephaven/log';
import type { dh as DhType } from '@deephaven/jsapi-types';
import { ComboBox } from '@deephaven/components';
import {
  type BaseFormatConfig,
  type ChangeCallback,
  getDefaultConditionConfigForType,
  getConditionConfig,
  getDefaultStyleConfig,
  type ModelColumn,
} from './ConditionalFormattingUtils';
import ConditionEditor from './ConditionEditor';
import StyleEditor from './StyleEditor';

const log = Log.module('RowFormatEditor');

export interface RowFormatEditorProps {
  columns: ModelColumn[];
  config?: BaseFormatConfig;
  dh: typeof DhType;
  onChange?: ChangeCallback;
}

const DEFAULT_CALLBACK = (): void => undefined;

function makeDefaultConfig(columns: ModelColumn[]): BaseFormatConfig {
  const { type, name } = columns[0];
  const column = { type, name };
  const config = {
    column,
    style: getDefaultStyleConfig(),
    ...getDefaultConditionConfigForType(type),
  };
  return config;
}

function RowFormatEditor(props: RowFormatEditorProps): JSX.Element {
  const {
    columns,
    config = makeDefaultConfig(columns),
    dh,
    onChange = DEFAULT_CALLBACK,
  } = props;

  const [selectedColumn, setColumn] = useState(
    columns.find(
      c => c.name === config.column.name && c.type === config.column.type
    ) ?? columns[0]
  );
  const [conditionConfig, setConditionConfig] = useState(
    getConditionConfig(config)
  );
  const [conditionValid, setConditionValid] = useState(false);
  const [selectedStyle, setStyle] = useState(config.style);

  const handleColumnChange = useCallback(
    value => {
      const newColumn = columns.find(({ name }) => name === value);
      if (newColumn !== undefined) {
        setColumn(newColumn);
        if (selectedColumn.type !== newColumn.type) {
          setConditionConfig(getDefaultConditionConfigForType(newColumn.type));
          setConditionValid(false);
        }
      } else {
        log.error(`Column ${value} not found.`);
      }
    },
    [columns, selectedColumn]
  );

  const handleConditionChange = useCallback(
    (updatedConditionConfig, isValid) => {
      log.debug('handleConditionChange', updatedConditionConfig, isValid);
      setConditionConfig(updatedConditionConfig);
      setConditionValid(isValid);
    },
    []
  );

  const handleStyleChange = useCallback(updatedStyleConfig => {
    log.debug('handleStyleChange', updatedStyleConfig);
    setStyle(updatedStyleConfig);
  }, []);

  useEffect(
    function updateRowFormat() {
      if (selectedColumn === undefined) {
        log.debug('Column is not selected, skip update.');
        return;
      }
      if (selectedStyle === undefined) {
        log.debug('Style is not selected, skip update.');
        return;
      }
      const { type, name } = selectedColumn;
      const column = { type, name };
      onChange(
        {
          column,
          style: selectedStyle,
          ...conditionConfig,
        },
        conditionValid
      );
    },
    [onChange, selectedColumn, selectedStyle, conditionConfig, conditionValid]
  );

  const columnNames = useMemo(() => columns.map(({ name }) => name), [columns]);

  return (
    <div className="conditional-rule-editor form">
      <div className="mb-2">
        <label className="mb-0">Format Row If</label>
        <ComboBox
          aria-label="Select column to format row by"
          defaultSelectedKey={selectedColumn?.name}
          onChange={handleColumnChange}
        >
          {columnNames}
        </ComboBox>
      </div>

      {selectedColumn !== undefined && (
        <>
          <ConditionEditor
            column={selectedColumn}
            config={conditionConfig}
            dh={dh}
            onChange={handleConditionChange}
          />
          <StyleEditor config={selectedStyle} onChange={handleStyleChange} />
        </>
      )}
    </div>
  );
}

export default RowFormatEditor;
