import { test, expect, Page } from '@playwright/test';
import { gotoPage, openTable } from './utils';

async function waitForLoadingDone(page: Page) {
  await expect(
    page.locator('.iris-grid .iris-grid-loading-status')
  ).toHaveCount(0);
}

test('can open a simple table', async ({ page }) => {
  await gotoPage(page, '');
  await openTable(page, 'simple_table');
  // Now we should be able to check the snapshot
  await expect(page.locator('.iris-grid-panel .iris-grid')).toHaveScreenshot();
});

test('can make a non-contiguous table row selection', async ({ page }) => {
  await gotoPage(page, '');
  await openTable(page, 'simple_table');

  const grid = await page.locator('.iris-grid-panel .iris-grid');
  const gridLocation = await grid.boundingBox();
  expect(gridLocation).not.toBeNull();
  if (gridLocation === null) return;

  // Based on default row and header height in IrisGridTheme
  // Ideally this would be calculated from the current theme
  const rowHeight = 19;
  const columnHeaderHeight = 30;

  // ctrl+click on every other row for 9 rows, starting at row 0 after the header
  /* eslint-disable no-await-in-loop */
  for (let i = 0; i < 9; i += 1) {
    await page.keyboard.down('Control');
    await page.mouse.click(
      gridLocation.x + 1, // plus one so we click on the first pixel not 0
      gridLocation.y + 1 + columnHeaderHeight + rowHeight * i * 2
      // times 2 because we're skipping every other row
    );
    await page.keyboard.up('Control');
  }
  /* eslint-enable no-await-in-loop */

  await expect(page.locator('.iris-grid-panel .iris-grid')).toHaveScreenshot();
});

test('can open a table with column header groups', async ({ page }) => {
  await gotoPage(page, '');
  await openTable(page, 'simple_table_header_group');
  // Now we should be able to check the snapshot
  await expect(page.locator('.iris-grid-panel .iris-grid')).toHaveScreenshot();
});

test('can open a table with column header groups and hidden columns', async ({
  page,
}) => {
  await gotoPage(page, '');
  await openTable(page, 'simple_table_header_group_hide');
  // Now we should be able to check the snapshot
  await expect(page.locator('.iris-grid-panel .iris-grid')).toHaveScreenshot();
});

test.describe('tests simple table operations', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPage(page, '');
    await openTable(page, 'simple_table');
    const tableOperationsMenu = page.locator(
      'data-testid=btn-iris-grid-settings-button-table'
    );
    await tableOperationsMenu.click();

    // Wait for Table Options menu to show
    await expect(page.locator('.table-sidebar')).toHaveCount(1);
  });

  test('can download table successfully', async ({ page }) => {
    // open Download CSV panel
    await page.locator('data-testid=menu-item-Download CSV').click();

    const downloadButton = page.locator(
      'data-testid=btn-csv-exporter-download'
    );
    expect(downloadButton).toHaveCount(1);

    // try renaming file before downloading
    const fileNameInputField = page.locator(
      'data-testid=input-csv-exporter-file-name'
    );
    // Triple click to highlight current, autogenerated name
    await fileNameInputField.click({ clickCount: 3 });
    await page.keyboard.type('sin-and-cos.csv');
    await expect(fileNameInputField).toHaveValue('sin-and-cos.csv');

    const downloadPromise = page.waitForEvent('download');
    downloadButton.click();
    await downloadPromise;

    // Wait for download to complete
    await expect(
      page.locator('.progress.progress-bar-striped.progress-bar-animated')
    ).toHaveCount(0);

    await expect(
      page.locator('.progress .progress-bar.bg-success')
    ).toHaveCount(1);
  });

  test('go to', async ({ page }) => {
    // open with sidepanel button
    await page.locator('data-testid=menu-item-Go to').click();

    const gotoBar = page.locator('.iris-grid-bottom-bar.goto-row');
    const gotoBarInputField = gotoBar.getByPlaceholder('Row number');

    // wait for panel to open
    await expect(gotoBarInputField).toHaveCount(1);

    // test invalid row index
    await gotoBarInputField.click();
    await page.keyboard.type('641');
    await expect(gotoBar.locator('.goto-row-wrapper .text-danger')).toHaveCount(
      1
    );

    // test valid row index (row 64)
    await page.keyboard.press('Backspace');
    await expect(gotoBar.locator('.goto-row-wrapper .text-danger')).toHaveCount(
      0
    );

    // Check snapshot
    await expect(page.locator('.iris-grid-column')).toHaveScreenshot();

    // close with sidepanel button
    await page.locator('data-testid=menu-item-Go to').click();

    await expect(gotoBar).toHaveCount(0);
  });

  test('advanced filters', async ({ page }) => {
    // turn quick filters on
    const quickFiltersItem = page.locator(
      'data-testid=menu-item-Quick Filters'
    );
    await quickFiltersItem.click();

    // wait for toggle to switch to 'on'
    await expect(
      quickFiltersItem.locator('.btn.btn-switch.active')
    ).toHaveCount(1);

    // Open the Advanced Filters panel from the table (pick the 'y' column)
    // Note: This may click in the wrong place if the browser size is changed
    await page
      .locator('.iris-grid .grid-wrapper')
      .click({ position: { x: 100, y: 35 } });

    // wait for the panel to open
    await expect(page.locator('.advanced-filter-creator')).toHaveCount(1);

    // Apply filter (greater than 0)
    const selectionMenu = page
      .locator('.advanced-filter-creator')
      .locator('select');
    await selectionMenu.click();
    await selectionMenu.selectOption('greaterThan');
    await page
      .locator('.advanced-filter-creator')
      .getByPlaceholder('Enter value')
      .click();
    await page.keyboard.type('0');

    // wait for filter adding to appear
    const addFilterItem = page.locator(
      '.advanced-filter-creator .add-filter-item'
    );
    await expect(addFilterItem).toHaveCount(1);

    // Apply additional filter (OR equal to 0)
    const selectionMenu2 = selectionMenu.nth(1);
    await addFilterItem.locator('button:has-text("OR")').click();
    await selectionMenu2.click();
    await selectionMenu2.selectOption('eq');
    await page
      .locator('.advanced-filter-creator')
      .getByPlaceholder('Enter value')
      .nth(1)
      .click();
    await page.keyboard.type('0');

    await page
      .locator('.advanced-filter-creator')
      .locator('button:has-text("Done")')
      .click();

    // Wait until it's done loading
    await expect(page.locator('.iris-grid .iris-grid-loading')).toHaveCount(0);

    // Check snapshot
    await expect(page.locator('.iris-grid-column')).toHaveScreenshot();

    // quick filter section (previously its own test)

    // check if quick filters are still on
    await expect(
      page
        .locator('data-testid=menu-item-Quick Filters')
        .locator('.btn.btn-switch.active')
    ).toHaveCount(1);

    // Click the quick filter box (x column)
    // Note: This may click in the wrong place if the browser size is changed
    await page
      .locator('.iris-grid .grid-wrapper')
      .click({ position: { x: 20, y: 35 } });

    // Apply filter (greater 37)
    await page.keyboard.type('>37');

    // Wait until it's done loading
    await waitForLoadingDone(page);

    // Check snapshot
    await expect(page.locator('.iris-grid-column')).toHaveScreenshot();
  });
});
