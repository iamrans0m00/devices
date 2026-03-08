/**
 * scripts/smoke-test-road-feel.ts
 *
 * Smoke-test script for the Tacx Neo road-feel feature.
 *
 * USAGE (no hardware needed - print & verify bytes for all 11 surfaces):
 *   npx ts-node scripts/smoke-test-road-feel.ts
 *   npx ts-node scripts/smoke-test-road-feel.ts --surface Gravel --intensity 75
 *   npx ts-node scripts/smoke-test-road-feel.ts --surface Off --intensity 0
 *
 * USAGE (show live adapter API calls):
 *   npx ts-node scripts/smoke-test-road-feel.ts --live
 */

import { RoadFeelSurface } from '../src/ble/tacx/consts.js';

// ── ANT+ FE-C message constants ───────────────────────────────────────────────

const SYNC              = 0xA4;
const MSG_LEN           = 0x09;  // 9 payload bytes
const ACKNOWLEDGED_DATA = 0x4F;
const CHANNEL           = 0x05;
const PAGE_ROAD_FEEL    = 0xDD;  // data page 221

// ── checksum — mirrors TacxAdvancedFitnessMachineDevice.getChecksum() ─────────

function getChecksum(bytes: number[]): number {
    let c = 0;
    for (const b of bytes) c = (c ^ b) % 0xFF;
    return c;
}

// ── build the 13-byte road-feel ANT+ message ──────────────────────────────────

function buildRoadFeelMessage(surface: number, intensity: number): Buffer {
    const s = surface & 0xFF;
    const i = Math.min(100, Math.max(0, Math.round(intensity))) & 0xFF;
    const head    = [SYNC, MSG_LEN, ACKNOWLEDGED_DATA];
    const payload = [CHANNEL, PAGE_ROAD_FEEL, s, i, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF];
    const chk     = getChecksum([...head, ...payload]);
    return Buffer.from([...head, ...payload, chk]);
}

// ── surface table ─────────────────────────────────────────────────────────────

const SURFACES: Array<{ name: string; value: RoadFeelSurface }> = [
    { name: 'Off',             value: RoadFeelSurface.Off },
    { name: 'Road',            value: RoadFeelSurface.Road },
    { name: 'CobblestoneHard', value: RoadFeelSurface.CobblestoneHard },
    { name: 'CobblestoneEasy', value: RoadFeelSurface.CobblestoneEasy },
    { name: 'BrickRoad',       value: RoadFeelSurface.BrickRoad },
    { name: 'Gravel',          value: RoadFeelSurface.Gravel },
    { name: 'Ice',             value: RoadFeelSurface.Ice },
    { name: 'WoodenPlanks',    value: RoadFeelSurface.WoodenPlanks },
    { name: 'GravelLight',     value: RoadFeelSurface.GravelLight },
    { name: 'GravelDeep',      value: RoadFeelSurface.GravelDeep },
    { name: 'Snow',            value: RoadFeelSurface.Snow },
];

// ── CLI arg parsing ───────────────────────────────────────────────────────────

const args      = process.argv.slice(2);
const isLive    = args.includes('--live');
const sIdx      = args.indexOf('--surface');
const iIdx      = args.indexOf('--intensity');
const surfArg   = sIdx !== -1 ? args[sIdx + 1] : undefined;
const intensity = iIdx !== -1 ? parseInt(args[iIdx + 1], 10) : 100;

const targets = surfArg
    ? SURFACES.filter(s =>
        s.name.toLowerCase() === surfArg.toLowerCase() ||
        s.value.toString() === surfArg)
    : SURFACES;

if (targets.length === 0) {
    console.error('Unknown surface:', surfArg);
    console.error('Valid names:', SURFACES.map(s => s.name).join(', '));
    process.exit(1);
}

if (!isLive) {
    // DRY RUN: print bytes for every selected surface
    const SEP = '  ' + '-'.repeat(75);
    console.log('');
    console.log('  Tacx Neo Road-Feel -- byte verification (dry-run)');
    console.log(SEP);
    console.log('  ' + 'Surface'.padEnd(20) + 'Val  Int  Hex bytes (13 bytes total)');
    console.log(SEP);
    for (const { name, value } of targets) {
        const msg = buildRoadFeelMessage(value, intensity);
        const hex = (msg.toString('hex').toUpperCase().match(/../g) || []).join(' ');
        console.log('  ' + name.padEnd(20) + String(value).padEnd(5) + String(intensity).padEnd(5) + hex);
    }
    console.log(SEP);
    console.log('');
    console.log('  Layout:  A4 09 4F 05 DD [surf] [int] FF FF FF FF FF [chk]');
    console.log('  Write characteristic: 6E40FEC3-B5A3-F393-E0A9-E50E24DCCA9E (TACX_FE_C_TX)');
    console.log('  Service:              6E40FEC1-B5A3-F393-E0A9-E50E24DCCA9E (TACX_FE_C)');
    console.log('');

    // Self-check against unit-test known-good vectors
    const checks: Array<[number, number, string]> = [
        [1,  100, 'A4094F05DD0164FFFFFFFFFFA0'],
        [0,    0, 'A4094F05DD0000FFFFFFFFFFC5'],
        [2,   50, 'A4094F05DD0232FFFFFFFFFFF5'],
        [10, 100, 'A4094F05DD0A64FFFFFFFFFFAB'],
    ];
    console.log('  Self-check against unit-test vectors:');
    let allOk = true;
    for (const [s, inten, expected] of checks) {
        const got = buildRoadFeelMessage(s, inten).toString('hex').toUpperCase();
        const ok  = got === expected;
        if (!ok) allOk = false;
        const status = ok ? 'PASS' : 'FAIL (expected=' + expected + ' got=' + got + ')';
        console.log('    surface=' + s + ' intensity=' + inten + ': ' + status);
    }
    console.log(allOk ? '  All self-checks PASSED' : '  WARNING: self-check FAILED');
    console.log('');

} else {
    // LIVE mode: print the adapter API calls to use once the device is connected
    console.log('');
    console.log('  Tacx Neo Road-Feel -- live hardware test instructions');
    console.log('');
    console.log('  Once BleTacxAdapter is connected inside the Incyclist app:');
    console.log('');
    console.log('    const adapter = new BleTacxAdapter(settings, props);');
    console.log('    await adapter.connect();');
    for (const { name, value } of targets) {
        console.log('    await adapter.setRoadFeel(RoadFeelSurface.' + name + ', ' + intensity + ');  // surface ' + value);
    }
    console.log('    await adapter.setRoadFeel(RoadFeelSurface.Off);  // reset');
    console.log('');
    console.log('  For raw BLE bytes, run without --live to get the hex sequences.');
    console.log('');
}
