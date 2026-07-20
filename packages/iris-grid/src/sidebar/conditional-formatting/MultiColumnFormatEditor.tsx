import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Log from '@deephaven/log';
import {
  ComboBox,
  type ItemKey,
  type ItemSelection,
  MultiSelect,
} from '@deephaven/components';
import type { dh as DhType } from '@deephaven/jsapi-types';
import {
  type BaseFormatConfig,
  type ChangeCallback,
  getDefaultConditionConfigForType,
  getConditionConfig,
  getDefaultStyleConfig,
  type ModelColumn,
  FormatStyleType,
  type ConditionConfig,
  type FormatStyleConfig,
} from './ConditionalFormattingUtils';
import ConditionEditor from './ConditionEditor';
import StyleEditor from './StyleEditor';

const log = Log.module('MultiColumnFormatEditor');

export interface MultiColumnFormatEditorProps {
  columns: ModelColumn[];
  config?: BaseFormatConfig;
  dh: typeof DhType;
  onChange?: ChangeCallback;
}

const DEFAULT_CALLBACK = (): void => undefined;

function makeDefaultConfig(columns: ModelColumn[]): BaseFormatConfig {
  const { type, name } = columns[0];
  const leftHandValue = { type, name };
  const config = {
    leftHandValue,
    formattedColumns: [] as ModelColumn[],
    style: getDefaultStyleConfig(),
    ...getDefaultConditionConfigForType(type),
  };
  return config;
}

function MultiColumnFormatEditor(
  props: MultiColumnFormatEditorProps
): JSX.Element {
  const {
    columns,
    config = makeDefaultConfig(columns),
    dh,
    onChange = DEFAULT_CALLBACK,
  } = props;

  const [selectedColumn, setColumn] = useState(
    columns.find(
      c =>
        c.name === config.leftHandValue.name &&
        c.type === config.leftHandValue.type
    ) ?? columns[0]
  );
  const [selectedFormattedColumns, setFormattedColumns] = useState<
    ModelColumn[]
  >(() => {
    const initial =
      config.formattedColumns.length > 0
        ? config.formattedColumns
        : [config.leftHandValue];
    return initial.map(
      col =>
        columns.find(c => c.name === col.name && c.type === col.type) ??
        columns[0]
    );
  });
  const [conditionConfig, setConditionConfig] = useState(
    getConditionConfig(config)
  );
  const [conditionValid, setConditionValid] = useState(false);
  const [selectedStyle, setStyle] = useState(config.style);

  const handleColumnChange = useCallback(
    (value: ItemKey | null) => {
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

  const handleFormattedColumnsChange = useCallback(
    (keys: ItemSelection) => {
      if (keys === 'all') return;
      const newCols = [...keys]
        .map(key => columns.find(c => c.name === String(key)))
        .filter((c): c is ModelColumn => c !== undefined);
      setFormattedColumns(newCols.length > 0 ? newCols : [columns[0]]);
    },
    [columns]
  );

  const handleConditionChange = useCallback(
    (updatedConditionConfig: ConditionConfig, isValid: boolean) => {
      log.debug('handleConditionChange', updatedConditionConfig, isValid);
      setConditionConfig(updatedConditionConfig);
      setConditionValid(isValid);
    },
    []
  );

  const handleStyleChange = useCallback(
    (updatedStyleConfig: FormatStyleConfig) => {
      log.debug('handleStyleChange', updatedStyleConfig);
      setStyle(updatedStyleConfig);
    },
    []
  );

  useEffect(
    function updateColumnFormat() {
      let isValid = conditionValid;

      if (selectedColumn === undefined) {
        log.debug('Column is not selected, invalidating update.');
        isValid = false;
      }
      if (
        selectedStyle === undefined ||
        selectedStyle.type === FormatStyleType.NO_FORMATTING
      ) {
        log.debug('Style is not selected, invalidating update.');
        isValid = false;
      }

      const { type, name } = selectedColumn;
      const leftHandValue = { type, name };
      onChange(
        {
          leftHandValue,
          formattedColumns: selectedFormattedColumns.map(
            ({ type: colType, name: colName }) => ({
              type: colType,
              name: colName,
            })
          ),
          style: selectedStyle,
          ...conditionConfig,
        },
        isValid
      );
    },
    [
      onChange,
      selectedColumn,
      selectedFormattedColumns,
      selectedStyle,
      conditionConfig,
      conditionValid,
    ]
  );

  const columnNames = useMemo(() => columns.map(({ name }) => name), [columns]);

  return (
    <div className="conditional-rule-editor form">
      <div className="mb-2">
        <label className="mb-0">Apply to Columns</label>
        <MultiSelect
          aria-label="Select columns to apply formatting to"
          selectedKeys={selectedFormattedColumns.map(c => c.name)}
          onChange={handleFormattedColumnsChange}
        >
          {columnNames}
        </MultiSelect>
      </div>
      <div className="mb-2">
        <label className="mb-0">Format Cell If</label>
        <ComboBox
          aria-label="Select column to format"
          defaultSelectedKey={selectedColumn?.name}
          onChange={handleColumnChange}
        >
          {columnNames}
        </ComboBox>
      </div>

      {selectedColumn !== undefined && (
        <>
          <ConditionEditor
            dh={dh}
            column={selectedColumn}
            columns={columns}
            config={conditionConfig}
            onChange={handleConditionChange}
          />
          <StyleEditor config={selectedStyle} onChange={handleStyleChange} />
        </>
      )}
    </div>
  );
}

export default MultiColumnFormatEditor;
