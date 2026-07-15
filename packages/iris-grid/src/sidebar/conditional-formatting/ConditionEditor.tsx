import React, { useCallback, useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import { TableUtils } from '@deephaven/jsapi-utils';
import type { dh as DhType } from '@deephaven/jsapi-types';
import Log from '@deephaven/log';
import { ComboBox, type ItemKey, Select } from '@deephaven/components';
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
  getColumnNameFromValue,
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

function getRightHandValueInput(
  columns: ModelColumn[],
  conditionValue: string | ModelColumn | undefined,
  onValueChange: (value: string | ModelColumn | undefined) => void,
  isInvalid: boolean
): JSX.Element {
  const displayValue = getColumnNameFromValue(conditionValue ?? '');

  return (
    <ComboBox
      aria-label="Enter or select a value"
      allowsCustomValue
      inputValue={displayValue}
      validationState={isInvalid ? 'invalid' : undefined}
      onInputChange={(text: string) => {
        const matched = columns.find(c => c.name === text);
        onValueChange(matched ?? text);
      }}
      onChange={(key: ItemKey | null) => {
        if (key == null) return;
        const matched = columns.find(c => c.name === String(key));
        onValueChange(matched ?? String(key));
      }}
    >
      {columns.map(c => c.name)}
    </ComboBox>
  );
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

  if (selectedColumnType !== prevColumnType) {
    // Column type changed, reset condition and value fields
    setCondition(getDefaultConditionForType(selectedColumnType));
    setValue(getDefaultValueForType(selectedColumnType));
    setStartValue(undefined);
    setEndValue(undefined);
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
        typeof conditionValue !== 'object' &&
        !isNumberConditionValid(
          selectedCondition as NumberCondition,
          conditionValue,
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
    // 'is-not-null'), so checking one covers all. Boolean conditions also never
    // need a value input.
    if (
      selectedCondition === StringCondition.IS_NULL ||
      selectedCondition === StringCondition.IS_NOT_NULL ||
      TableUtils.isBooleanType(selectedColumnType)
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
    // Numbers are cross-compatible (int vs double), text types are
    // cross-compatible (String vs char), everything else requires the same
    // normalized type.
    const compatibleRhvColumns = columns.filter(c => {
      if (TableUtils.isNumberType(selectedColumnType)) {
        return TableUtils.isNumberType(c.type);
      }
      if (TableUtils.isTextType(selectedColumnType)) {
        return TableUtils.isTextType(c.type);
      }
      return (
        TableUtils.getNormalizedType(selectedColumnType) ===
        TableUtils.getNormalizedType(c.type)
      );
    });

    // IS_BETWEEN uses two separate range inputs
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

    // All remaining conditions use the column/value combobox
    return getRightHandValueInput(
      compatibleRhvColumns,
      conditionValue,
      handleRightHandValueChange,
      hasInvalidValue
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
