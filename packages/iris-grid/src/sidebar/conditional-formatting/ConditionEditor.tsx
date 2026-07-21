import React, { useCallback, useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import { TableUtils } from '@deephaven/jsapi-utils';
import type { dh as DhType } from '@deephaven/jsapi-types';
import Log from '@deephaven/log';
import { Select, Tooltip, ToggleButton } from '@deephaven/components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { vsTable, dhInput } from '@deephaven/icons';
import {
  StringCondition,
  DateCondition,
  getLabelForNumberCondition,
  getLabelForDateCondition,
  getLabelForStringCondition,
  NumberCondition,
  type ModelColumn,
  type ConditionConfig,
  getDefaultConditionForType,
  getLabelForBooleanCondition,
  BooleanCondition,
  CharCondition,
  type Condition,
  getLabelForCharCondition,
  isDateConditionValid,
  getDefaultValueForType,
} from './ConditionalFormattingUtils';

const log = Log.module('ConditionEditor');

export interface ConditionEditorProps {
  dh: typeof DhType;
  column: ModelColumn;
  columns: ModelColumn[];
  config: ConditionConfig;
  onChange?: (config: ConditionConfig, isValid: boolean) => void;
}

const DEFAULT_CALLBACK = (): void => undefined;

const numberConditionOptions = [
  NumberCondition.IS_EQUAL,
  NumberCondition.IS_NOT_EQUAL,
  NumberCondition.IS_BETWEEN,
  NumberCondition.GREATER_THAN,
  NumberCondition.GREATER_THAN_OR_EQUAL,
  NumberCondition.LESS_THAN,
  NumberCondition.LESS_THAN_OR_EQUAL,
  NumberCondition.IS_NULL,
  NumberCondition.IS_NOT_NULL,
].map(option => (
  <option key={option} value={option}>
    {getLabelForNumberCondition(option)}
  </option>
));

const stringConditions = [
  StringCondition.IS_EXACTLY,
  StringCondition.IS_NOT_EXACTLY,
  StringCondition.CONTAINS,
  StringCondition.DOES_NOT_CONTAIN,
  StringCondition.STARTS_WITH,
  StringCondition.ENDS_WITH,
  StringCondition.IS_NULL,
  StringCondition.IS_NOT_NULL,
].map(option => (
  <option key={option} value={option}>
    {getLabelForStringCondition(option)}
  </option>
));

const dateConditions = [
  DateCondition.IS_EXACTLY,
  DateCondition.IS_NOT_EXACTLY,
  DateCondition.IS_BEFORE,
  DateCondition.IS_BEFORE_OR_EQUAL,
  DateCondition.IS_AFTER,
  DateCondition.IS_AFTER_OR_EQUAL,
  DateCondition.IS_NULL,
  DateCondition.IS_NOT_NULL,
].map(option => (
  <option key={option} value={option}>
    {getLabelForDateCondition(option)}
  </option>
));

const booleanConditions = [
  BooleanCondition.IS_TRUE,
  BooleanCondition.IS_FALSE,
  BooleanCondition.IS_EQUAL,
  BooleanCondition.IS_NOT_EQUAL,
  BooleanCondition.IS_NULL,
  BooleanCondition.IS_NOT_NULL,
].map(option => (
  <option key={option} value={option}>
    {getLabelForBooleanCondition(option)}
  </option>
));

const charConditions = [
  CharCondition.IS_EQUAL,
  CharCondition.IS_NOT_EQUAL,
  CharCondition.IS_NULL,
  CharCondition.IS_NOT_NULL,
].map(option => (
  <option key={option} value={option}>
    {getLabelForCharCondition(option)}
  </option>
));

function isNumberConditionValid(
  condition: NumberCondition,
  value?: string,
  startValue?: string,
  endValue?: string
): boolean {
  if (
    condition === NumberCondition.IS_NULL ||
    condition === NumberCondition.IS_NOT_NULL
  ) {
    return true;
  }
  if (
    condition === NumberCondition.IS_BETWEEN &&
    startValue != null &&
    startValue !== '' &&
    !Number.isNaN(Number.parseFloat(startValue)) &&
    endValue != null &&
    endValue !== '' &&
    !Number.isNaN(Number.parseFloat(endValue))
  ) {
    return true;
  }
  if (
    condition !== NumberCondition.IS_BETWEEN &&
    value !== undefined &&
    value !== '' &&
    !Number.isNaN(Number.parseFloat(value))
  ) {
    return true;
  }
  return false;
}

function ConditionEditor(props: ConditionEditorProps): JSX.Element {
  const { column, columns, config, dh, onChange = DEFAULT_CALLBACK } = props;
  const selectedColumnType = column.type;
  const [prevColumnType, setPrevColumnType] = useState(selectedColumnType);
  const [selectedCondition, setCondition] = useState(config.condition);
  const [conditionValue, setValue] = useState<string | ModelColumn | undefined>(
    config.rightHandValue
  );
  const [startValue, setStartValue] = useState(config.start);
  const [endValue, setEndValue] = useState(config.end);
  const [isValid, setIsValid] = useState(true);
  const [rhvColumnMode, setRhvColumnMode] = useState(
    typeof config.rightHandValue === 'object'
  );

  if (selectedColumnType !== prevColumnType) {
    // Column type changed, reset condition and value fields
    setCondition(getDefaultConditionForType(selectedColumnType));
    setValue(getDefaultValueForType(selectedColumnType));
    setStartValue(undefined);
    setEndValue(undefined);
    setRhvColumnMode(false);
    setPrevColumnType(selectedColumnType);
  }

  const conditions = useMemo(() => {
    if (selectedColumnType === undefined) {
      return [];
    }
    if (TableUtils.isNumberType(selectedColumnType)) {
      return numberConditionOptions;
    }
    if (TableUtils.isCharType(selectedColumnType)) {
      return charConditions;
    }
    if (TableUtils.isStringType(selectedColumnType)) {
      return stringConditions;
    }
    if (TableUtils.isDateType(selectedColumnType)) {
      return dateConditions;
    }
    if (TableUtils.isBooleanType(selectedColumnType)) {
      return booleanConditions;
    }
  }, [selectedColumnType]);

  const handleRhvColumnModeToggle = useCallback(() => {
    setRhvColumnMode(prev => {
      const next = !prev;
      if (next) {
        // Switching to column mode — default to first compatible column
        const firstCompatible = columns.find(c => {
          if (TableUtils.isNumberType(selectedColumnType)) {
            return TableUtils.isNumberType(c.type);
          }
          return (
            TableUtils.getNormalizedType(selectedColumnType) ===
            TableUtils.getNormalizedType(c.type)
          );
        });
        setValue(
          firstCompatible != null
            ? { name: firstCompatible.name, type: firstCompatible.type }
            : undefined
        );
      } else {
        // Switching to text mode — clear the column value
        setValue(getDefaultValueForType(selectedColumnType));
      }
      return next;
    });
  }, [columns, selectedColumnType]);

  const handleConditionChange = useCallback((value: string) => {
    log.debug('handleConditionChange', value);
    setCondition(value as Condition);
  }, []);

  const handleRightHandValueChange = useCallback(
    (value: string | ModelColumn | undefined) => {
      log.debug('handleRightHandValueChange', value);
      setValue(value);
    },
    []
  );

  const handleStartValueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = e.target;
      log.debug('handleStartValueChange', value);
      setStartValue(value);
    },
    []
  );

  const handleEndValueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = e.target;
      log.debug('handleEndValueChange', value);
      setEndValue(value);
    },
    []
  );

  useEffect(
    function changeCondition() {
      let isConditionValid = true;

      if (selectedCondition === undefined) {
        log.debug(
          'Unable to create formatting rule. Condition is not selected.'
        );
        isConditionValid = false;
      } else if (
        TableUtils.isNumberType(column.type) &&
        (selectedCondition === NumberCondition.IS_BETWEEN ||
          typeof conditionValue !== 'object') &&
        !isNumberConditionValid(
          selectedCondition as NumberCondition,
          typeof conditionValue === 'string' ? conditionValue : undefined,
          startValue,
          endValue
        )
      ) {
        log.debug(
          'Unable to create formatting rule. Invalid value',
          conditionValue
        );
        isConditionValid = false;
      } else if (
        TableUtils.isDateType(column.type) &&
        typeof conditionValue !== 'object' &&
        !isDateConditionValid(
          dh,
          selectedCondition as DateCondition,
          conditionValue
        )
      ) {
        log.debug(
          'Unable to create formatting rule. Invalid date condition',
          conditionValue
        );
        isConditionValid = false;
      } else if (
        TableUtils.isCharType(column.type) &&
        typeof conditionValue !== 'object' &&
        selectedCondition !== CharCondition.IS_NULL &&
        selectedCondition !== CharCondition.IS_NOT_NULL &&
        (conditionValue === undefined || conditionValue.length !== 1)
      ) {
        log.debug(
          'Unable to create formatting rule. Char value must be a single character',
          conditionValue
        );
        isConditionValid = false;
      } else if (
        TableUtils.isBooleanType(column.type) &&
        typeof conditionValue !== 'object' &&
        (selectedCondition === BooleanCondition.IS_EQUAL ||
          selectedCondition === BooleanCondition.IS_NOT_EQUAL) &&
        conditionValue !== 'true' &&
        conditionValue !== 'false' &&
        conditionValue !== 'null'
      ) {
        log.debug(
          'Unable to create formatting rule. Boolean comparison requires a column, true, false, or null',
          conditionValue
        );
        isConditionValid = false;
      }

      setIsValid(isConditionValid);
      onChange(
        {
          condition: selectedCondition,
          rightHandValue: conditionValue,
          start: startValue,
          end: endValue,
        },
        isConditionValid
      );
    },
    [
      onChange,
      column.type,
      dh,
      selectedCondition,
      conditionValue,
      startValue,
      endValue,
    ]
  );

  const conditionInputs = useMemo(() => {
    if (selectedColumnType === undefined) {
      // Column not selected
      return null;
    }

    // IS_NULL/IS_NOT_NULL enum values are identical across all types ('is-null' /
    // 'is-not-null'), so checking one enum covers all.
    // Boolean IS_TRUE/IS_FALSE also never need a value input.
    if (
      selectedCondition === StringCondition.IS_NULL ||
      selectedCondition === StringCondition.IS_NOT_NULL ||
      selectedCondition === BooleanCondition.IS_TRUE ||
      selectedCondition === BooleanCondition.IS_FALSE
    ) {
      return null;
    }

    // A ModelColumn rightHandValue is always valid (column-vs-column comparison).
    // For string values, check type-specific validity.
    const rhvIsColumn = typeof conditionValue === 'object';
    const hasInvalidValue =
      !rhvIsColumn &&
      !isValid &&
      conditionValue !== undefined &&
      conditionValue !== '';

    // Only offer columns that are type-compatible with the condition column so
    // the generated expression is valid (e.g. prevent startsWith(intColumn)).
    // Numbers are cross-compatible (int vs double). Everything else requires the same
    // normalized type. (Note: text types are not compatible (string vs char)
    const compatibleRhvColumns = columns.filter(c => {
      if (TableUtils.isNumberType(selectedColumnType)) {
        return TableUtils.isNumberType(c.type);
      }
      return (
        TableUtils.getNormalizedType(selectedColumnType) ===
        TableUtils.getNormalizedType(c.type)
      );
    });

    // IS_BETWEEN uses two separate range inputs — no toggle
    if (
      TableUtils.isNumberType(selectedColumnType) &&
      selectedCondition === NumberCondition.IS_BETWEEN
    ) {
      const isInvalid =
        !rhvIsColumn &&
        !isValid &&
        ((startValue !== undefined && startValue !== '') ||
          (endValue !== undefined && endValue !== ''));
      return (
        <div className="d-flex flex-row">
          <input
            type="number"
            className={classNames('form-control', 'd-flex', 'mr-2', {
              'is-invalid': isInvalid,
            })}
            placeholder="Start value"
            value={startValue ?? ''}
            onChange={handleStartValueChange}
          />
          <input
            type="number"
            className={classNames('form-control', 'd-flex', {
              'is-invalid': isInvalid,
            })}
            placeholder="End value"
            value={endValue ?? ''}
            onChange={handleEndValueChange}
          />
        </div>
      );
    }

    // All other conditions: toggle between text input and column picker
    const columnToggle = (
      <ToggleButton
        isSelected={rhvColumnMode}
        onChange={handleRhvColumnModeToggle}
        aria-label={rhvColumnMode ? 'Columns' : 'Value'}
      >
        <Tooltip>{rhvColumnMode ? 'Columns' : 'Value'}</Tooltip>
        <FontAwesomeIcon icon={rhvColumnMode ? vsTable : dhInput} />
      </ToggleButton>
    );

    if (rhvColumnMode) {
      return (
        <div className="d-flex align-items-center">
          <Select
            value={
              typeof conditionValue === 'object' ? conditionValue.name : ''
            }
            className="custom-select flex-grow-1"
            onChange={value => {
              const col = compatibleRhvColumns.find(c => c.name === value);
              if (col != null) {
                handleRightHandValueChange({
                  name: col.name,
                  type: col.type,
                });
              }
            }}
          >
            {compatibleRhvColumns.map(c => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </Select>
          {columnToggle}
        </div>
      );
    }

    return (
      <div className="d-flex align-items-center">
        <input
          type="text"
          className={classNames('form-control', 'flex-grow-1', {
            'is-invalid': hasInvalidValue,
          })}
          value={typeof conditionValue === 'string' ? conditionValue : ''}
          onChange={e => handleRightHandValueChange(e.target.value)}
        />
        {columnToggle}
      </div>
    );
  }, [
    columns,
    selectedColumnType,
    selectedCondition,
    conditionValue,
    startValue,
    endValue,
    isValid,
    handleRightHandValueChange,
    handleStartValueChange,
    handleEndValueChange,
    handleRhvColumnModeToggle,
    rhvColumnMode,
  ]);

  return (
    <div className="condition-editor mb-2">
      <Select
        value={selectedCondition}
        data-testid="condition-select"
        className="custom-select mb-2"
        onChange={handleConditionChange}
      >
        {conditions}
      </Select>
      {conditionInputs}
    </div>
  );
}

export default ConditionEditor;
