# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.32.0](https://github.com/deephaven/web-client-ui/compare/v0.31.1...v0.32.0) (2023-03-10)

### Code Refactoring

- Replace usage of Column.index with column name ([#1126](https://github.com/deephaven/web-client-ui/issues/1126)) ([7448a88](https://github.com/deephaven/web-client-ui/commit/7448a88a651f82416de9c2aa0ebbbb217a6eae5c)), closes [#965](https://github.com/deephaven/web-client-ui/issues/965)

### BREAKING CHANGES

- Removed index property from dh.types Column type.
  IrisGridUtils.dehydrateSort now returns column name instead of index.
  TableUtils now expects column name instead of index for functions that
  don't have access to a columns array.

# [0.31.0](https://github.com/deephaven/web-client-ui/compare/v0.30.1...v0.31.0) (2023-03-03)

### Features

- Instants and ZonedDateTimes should be treated as DateTimes ([#1117](https://github.com/deephaven/web-client-ui/issues/1117)) ([3900a2e](https://github.com/deephaven/web-client-ui/commit/3900a2e5b319bbc78c300b05fb21c9d529e81488)), closes [deephaven/deephaven-core#3385](https://github.com/deephaven/deephaven-core/issues/3385) [deephaven/deephaven-core#3455](https://github.com/deephaven/deephaven-core/issues/3455)

## [0.30.1](https://github.com/deephaven/web-client-ui/compare/v0.30.0...v0.30.1) (2023-02-16)

**Note:** Version bump only for package @deephaven/jsapi-utils

# [0.30.0](https://github.com/deephaven/web-client-ui/compare/v0.29.1...v0.30.0) (2023-02-13)

**Note:** Version bump only for package @deephaven/jsapi-utils

# [0.29.0](https://github.com/deephaven/web-client-ui/compare/v0.28.0...v0.29.0) (2023-02-03)

**Note:** Version bump only for package @deephaven/jsapi-utils