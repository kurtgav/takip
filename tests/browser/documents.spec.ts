import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { continueToSave, enableAutomaticChecks, expectRequestsCached } from './sample';

type Region = { name: string; x: number; y: number; width: number; height: number };
type Fixture = { name: string; buffer: Buffer; document: 'ID' | 'Payment card'; expected: string[]; disabled?: string[]; fullNames?: number };

const checkDigit = (value: string): string => {
  const weights = [7, 3, 1];
  const characterValue = (character: string) => character === '<' ? 0
    : /\d/.test(character) ? Number(character) : character.charCodeAt(0) - 55;
  return String([...value].reduce((sum, character, index) => sum + characterValue(character) * weights[index % 3], 0) % 10);
};

function passportMrz(): [string, string] {
  const first = 'P<PHL' + 'SAMPLE<<ALEXIS<FICTION'.padEnd(39, '<');
  const passport = 'P0000000'.padEnd(9, '<');
  const birth = '900101';
  const expiry = '351231';
  const optional = ''.padEnd(14, '<');
  const partial = `${passport}${checkDigit(passport)}PHL${birth}${checkDigit(birth)}F${expiry}${checkDigit(expiry)}${optional}${checkDigit(optional)}`;
  const second = partial + checkDigit(`${passport}${checkDigit(passport)}${birth}${checkDigit(birth)}${expiry}${checkDigit(expiry)}${optional}${checkDigit(optional)}`);
  expect(first).toHaveLength(44);
  expect(second).toHaveLength(44);
  return [first, second];
}

async function passportFixture(page: Page): Promise<{ buffer: Buffer; regions: Region[] }> {
  const mrz = passportMrz();
  const result = await page.evaluate(([firstMrz, secondMrz]) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1600; canvas.height = 1050;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#17231d';
    context.font = '700 42px Arial';
    context.fillText('SYNTHETIC PHILIPPINE PASSPORT — NOT VALID', 60, 65);
    context.font = '700 24px Arial';
    context.fillText('REPUBLIC OF THE PHILIPPINES / REPUBLIKA NG PILIPINAS', 60, 105);

    context.fillStyle = '#d9e5dc'; context.fillRect(75, 180, 340, 530);
    context.fillStyle = '#315c49'; context.beginPath(); context.arc(245, 320, 92, 0, Math.PI * 2); context.fill();
    context.fillRect(135, 430, 220, 210);
    context.fillStyle = '#17231d'; context.font = '700 22px Arial'; context.fillText('FICTIONAL PORTRAIT', 118, 685);

    const regions: Region[] = [];
    const field = (label: string, value: string, x: number, labelY: number, name: string) => {
      context.fillStyle = '#4b5a52'; context.font = '600 21px Arial'; context.fillText(label, x, labelY);
      context.fillStyle = '#111'; context.font = '700 34px Arial';
      const baseline = labelY + 43;
      context.fillText(value, x, baseline);
      regions.push({ name, x: x - 3, y: baseline - 35, width: context.measureText(value).width + 6, height: 43 });
    };
    field('APELYIDO / SURNAME', 'SAMPLE', 500, 190, 'surname');
    field('MGA PANGALAN / GIVEN NAMES', 'ALEXIS', 500, 300, 'given names');
    field('GITNANG PANGALAN / MIDDLE NAME', 'FICTION', 500, 410, 'middle name');
    field('PASSPORT NO. / PASAPORTE BLG.', 'P0000000', 1050, 115, 'passport number');
    field('PETSA NG KAPANGANAKAN / DATE OF BIRTH', '01 JAN 1990', 500, 500, 'birth date');
    field('NASYONALIDAD / NATIONALITY', 'FILIPINO', 1050, 500, 'nationality');
    field('KASARIAN / SEX', 'F', 500, 600, 'sex');
    field('POOK NG KAPANGANAKAN / PLACE OF BIRTH', 'TEST CITY', 750, 600, 'birthplace');
    field('PETSA NG PAGKAKALOOB / DATE OF ISSUE', '01 JAN 2025', 500, 700, 'issue date');
    field('PETSA NG PAGKAPASO / DATE OF EXPIRY', '31 DEC 2035', 500, 800, 'expiry date');

    context.fillStyle = '#111'; context.font = '700 20px Arial';
    context.fillText('ALEXIS SAMPLE P0000000', 1200, 330);
    regions.push({ name: 'repeated security text', x: 1198, y: 307, width: context.measureText('ALEXIS SAMPLE P0000000').width + 6, height: 29 });
    regions.push({ name: 'portrait area', x: 75, y: 180, width: 340, height: 530 });

    context.fillStyle = '#111'; context.font = '700 42px "Courier New", monospace';
    const mrz = (value: string, baseline: number, name: string) => {
      context.fillText(value, 60, baseline);
      regions.push({ name, x: 57, y: baseline - 43, width: context.measureText(value).width + 6, height: 51 });
    };
    mrz(firstMrz, 920, 'MRZ row 1');
    mrz(secondMrz, 985, 'MRZ row 2');
    const small = document.createElement('canvas');
    small.width = 800; small.height = 525;
    small.getContext('2d')!.drawImage(canvas, 0, 0, small.width, small.height);
    return {
      png: small.toDataURL('image/png').split(',')[1],
      regions: regions.map(region => ({
        ...region, x: region.x / 2, y: region.y / 2, width: region.width / 2, height: region.height / 2,
      })),
    };
  }, mrz);
  return { buffer: Buffer.from(result.png, 'base64'), regions: result.regions };
}

async function fieldCard(page: Page, title: string, fields: Array<[string, string]>): Promise<Buffer> {
  const base64 = await page.evaluate(({ title, fields }) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200; canvas.height = 760;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#173c2d'; context.font = '700 38px Arial'; context.fillText(title, 48, 62);
    context.fillStyle = '#6a2c22'; context.font = '700 24px Arial'; context.fillText('SYNTHETIC TEST CARD — NOT VALID — FICTIONAL DATA', 48, 105);
    fields.forEach(([label, value], index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = 55 + column * 570;
      const y = 165 + row * 135;
      context.fillStyle = '#4b5a52'; context.font = '600 22px Arial'; context.fillText(label, x, y);
      context.fillStyle = '#111'; context.font = '700 34px Arial'; context.fillText(value, x, y + 48);
    });
    return canvas.toDataURL('image/png').split(',')[1];
  }, { title, fields });
  return Buffer.from(base64, 'base64');
}

async function inspectDetections(page: Page, fixture: Fixture): Promise<void> {
  await page.getByLabel('Choose photo', { exact: true }).setInputFiles({
    name: `${fixture.name}.png`, mimeType: 'image/png', buffer: fixture.buffer,
  });
  await expect(page.getByRole('heading', { name: 'Your details. Your decision.' })).toBeVisible({ timeout: 120_000 });
  await expect(page.locator('.document-type')).toContainText(`Looks like: ${fixture.document}`);
  await page.getByRole('button', { name: 'Edit detected details', exact: true }).click();
  const list = page.getByRole('list', { name: 'Detected items' });
  for (const category of fixture.expected) {
    const items = list.locator(`li[data-category="${category}"]`);
    await expect(items.first(), `${fixture.name}: missing ${category}`).toBeVisible();
    for (let index = 0; index < await items.count(); index++) {
      await expect(items.nth(index).getByRole('checkbox')).toBeChecked();
    }
  }
  for (const category of fixture.disabled ?? []) {
    const items = list.locator(`li[data-category="${category}"]`);
    await expect(items.first(), `${fixture.name}: missing optional ${category}`).toBeVisible();
    for (let index = 0; index < await items.count(); index++) {
      await expect(items.nth(index).getByRole('checkbox')).not.toBeChecked();
    }
  }
  if (fixture.fullNames !== undefined) {
    await expect(list.locator('li[data-category="full_name"]'), `${fixture.name}: institution label became a person`).toHaveCount(fixture.fullNames);
    await expect(list.locator('li[data-category="possible_name"]'), `${fixture.name}: institution label became a possible person`).toHaveCount(0);
    await expect(list.locator('li[data-category="possible_location"]'), `${fixture.name}: institution label became a possible location`).toHaveCount(0);
  }
  await expect(page.getByTestId('network-counter')).toHaveText('0 network requests · 0 blocked attempts');
}

async function verifyOpaqueTextCovers(page: Page, source: Buffer, output: Buffer, regions: Region[]): Promise<void> {
  const result = await page.evaluate(async ({ source, output, regions }) => {
    const decode = async (value: string) => {
      const bytes = Uint8Array.from(atob(value), character => character.charCodeAt(0));
      return await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    };
    const [sourceImage, outputImage] = await Promise.all([decode(source), decode(output)]);
    const canvas = new OffscreenCanvas(sourceImage.width, sourceImage.height);
    const context = canvas.getContext('2d')!;
    context.drawImage(sourceImage, 0, 0);
    const original = context.getImageData(0, 0, canvas.width, canvas.height).data;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(outputImage, 0, 0);
    const covered = context.getImageData(0, 0, canvas.width, canvas.height).data;
    return { dimensions: {
      source: [sourceImage.width, sourceImage.height], output: [outputImage.width, outputImage.height],
    }, regions: regions.map(region => {
      let sourceInk = 0; let missedInk = 0; let coverPixels = 0; let nonOpaque = 0;
      const left = Math.max(0, Math.floor(region.x));
      const top = Math.max(0, Math.floor(region.y));
      const right = Math.min(canvas.width, Math.ceil(region.x + region.width));
      const bottom = Math.min(canvas.height, Math.ceil(region.y + region.height));
      for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
        const offset = (y * canvas.width + x) * 4;
        const isCover = covered[offset] === 0x14 && covered[offset + 1] === 0x28 && covered[offset + 2] === 0x1f && covered[offset + 3] === 0xff;
        const isCoreInk = original[offset] < 64 && original[offset + 1] < 64 && original[offset + 2] < 64;
        if (isCoreInk) { sourceInk++; if (!isCover) missedInk++; }
        if (isCover) coverPixels++;
        if (covered[offset + 3] !== 0xff) nonOpaque++;
      }
      return { name: region.name, sourceInk, missedInk, coverPixels, nonOpaque };
    }) };
  }, { source: source.toString('base64'), output: output.toString('base64'), regions });

  expect(result.dimensions.source).toEqual([800, 525]);
  expect(result.dimensions.output).toEqual(result.dimensions.source);
  for (const region of result.regions) {
    expect(region.sourceInk, `${region.name}: fixture text was not rendered`).toBeGreaterThan(20);
    expect(region.missedInk, `${region.name}: sensitive glyph pixels remain visible`).toBe(0);
    expect(region.coverPixels, `${region.name}: no solid cover was rendered`).toBeGreaterThan(region.sourceInk);
    expect(region.nonOpaque, `${region.name}: export contains transparent pixels`).toBe(0);
  }
}

test('offline OCR covers synthetic passport fields and recognizes labeled Philippine card numbers', async ({ page, context }) => {
  test.setTimeout(900_000);
  await page.goto('./');
  await enableAutomaticChecks(page);
  await expect(page.getByText('Editor and checks ready offline', { exact: true })).toBeVisible();

  const passport = await passportFixture(page);
  const fixtures: Fixture[] = [
    {
      name: 'drivers-license', document: 'ID', expected: ['full_name', 'drivers_license', 'birthday', 'address', 'medical_details'], disabled: ['agency_code'], fullNames: 1,
      buffer: await fieldCard(page, "REPUBLIC OF THE PHILIPPINES DRIVER'S LICENSE", [
        ['FULL NAME', 'CASEY SAMPLE'], ['LICENSE NO.', 'A01-23-456789'],
        ['DATE OF BIRTH', '01 JAN 1990'], ['ADDRESS', '17 FICTION STREET'],
        ['BLOOD TYPE', 'AB+'], ['CONDITIONS', 'NONE'], ['AGENCY CODE', 'TEST-007'],
      ]),
    },
    {
      name: 'school-id', document: 'ID', expected: ['full_name', 'student_number', 'learner_number', 'education'], fullNames: 1,
      buffer: await fieldCard(page, 'STUDENT ID', [
        ['SCHOOL NAME', 'FICTIONAL HORIZON ACADEMY'], ['FULL NAME', 'CASEY SAMPLE'],
        ['STUDENT NUMBER', 'TEST-2026-0042'], ['LEARNER REFERENCE NUMBER', '123456789012'],
        ['COURSE', 'BS SAMPLE SCIENCE'],
      ]),
    },
    {
      name: 'employee-id', document: 'ID', expected: ['full_name', 'employee_number'], disabled: ['agency_code'], fullNames: 1,
      buffer: await fieldCard(page, 'EMPLOYEE ID', [
        ['COMPANY NAME', 'FICTIONAL EXAMPLE WORKS'], ['FULL NAME', 'CASEY SAMPLE'],
        ['EMPLOYEE NUMBER', 'TEST-EMP-042'], ['AGENCY CODE', 'TEST-007'],
      ]),
    },
    {
      name: 'payment-card', document: 'Payment card', expected: ['full_name', 'card_number', 'account_number', 'card_security_code', 'payment_secret', 'expiry_date'], fullNames: 1,
      buffer: await fieldCard(page, 'PAYMENT CARD', [
        ['BANK NAME', 'FICTIONAL TEST BANK'], ['CARDHOLDER NAME', 'CASEY SAMPLE'],
        ['CARD NUMBER', '4111 1111 1111 1111'], ['ACCOUNT NUMBER', '123456789012'],
        ['CVV', '123'], ['ONE TIME PASSWORD', '654321'], ['VALID THRU', '12/30'],
      ]),
    },
    {
      name: 'sss-umid', document: 'ID', expected: ['full_name', 'sss', 'umid'], fullNames: 1,
      buffer: await fieldCard(page, 'REPUBLIC OF THE PHILIPPINES — SSS UMID ID', [
        ['FULL NAME', 'CASEY SAMPLE'], ['SSS NUMBER', '12-3456789-0'],
        ['COMMON REFERENCE NUMBER', '1234-1234567-1'],
      ]),
    },
    {
      name: 'bir-tin', document: 'ID', expected: ['full_name', 'tin'], disabled: ['agency_code'], fullNames: 1,
      buffer: await fieldCard(page, 'REPUBLIC OF THE PHILIPPINES — BIR TIN CARD', [
        ['REGISTERED NAME', 'CASEY SAMPLE'], ['TAX IDENTIFICATION NUMBER', '123-456-789-000'],
        ['RDO CODE', 'TEST-007'],
      ]),
    },
    {
      name: 'pagibig', document: 'ID', expected: ['full_name', 'pagibig'], fullNames: 1,
      buffer: await fieldCard(page, 'REPUBLIC OF THE PHILIPPINES — PAG-IBIG ID', [
        ['FULL NAME', 'CASEY SAMPLE'], ['PAG-IBIG MID NUMBER', '1234-5678-9012'],
      ]),
    },
    {
      name: 'philhealth', document: 'ID', expected: ['full_name', 'philhealth'], fullNames: 1,
      buffer: await fieldCard(page, 'REPUBLIC OF THE PHILIPPINES — PHILHEALTH ID', [
        ['FULL NAME', 'CASEY SAMPLE'], ['PHILHEALTH IDENTIFICATION NUMBER', '12-123456789-1'],
      ]),
    },
  ];

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Choose Photo', exact: true })).toBeEnabled({ timeout: 120_000 });
  const requests: string[] = [];
  const failures: string[] = [];
  context.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  context.on('requestfailed', request => failures.push(request.url()));

  await test.step('passport labels, MRZ rows, and opaque export', async () => {
    await inspectDetections(page, {
      name: 'synthetic-passport', buffer: passport.buffer, document: 'ID',
      expected: ['passport', 'full_name', 'birthday', 'birthplace', 'sex', 'nationality', 'issue_date', 'expiry_date', 'mrz', 'passport_security_area', 'passport_portrait_area', 'passport_details_area'],
    });
    await expect(page.locator('.detection-list li[data-category="mrz"]')).toHaveCount(2);
    // Three name fields plus the independently readable repeat in security print.
    await expect(page.locator('.detection-list li[data-category="full_name"]')).toHaveCount(4);
    await continueToSave(page);
    await page.getByRole('checkbox', { name: /I checked the photo/ }).check();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Save safe copy', exact: true }).click();
    const output = await readFile(await (await download).path());
    await verifyOpaqueTextCovers(page, passport.buffer, output, passport.regions);
  });

  for (const fixture of fixtures) {
    await test.step(fixture.name, async () => {
      await page.getByRole('button', { name: 'New photo', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Choose Photo', exact: true })).toBeEnabled();
      await inspectDetections(page, fixture);
    });
  }

  expect(failures).toEqual([]);
  await expectRequestsCached(page, requests);
});
