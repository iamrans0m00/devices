import BleTacxAdapter from './adapter';
import { RoadFeelSurface } from './consts';
import { MockLogger } from '../../../test/logger';

// ── helpers ──────────────────────────────────────────────────────────────────

const makeSensorMock = () => ({
    sendRoadFeel:          vi.fn().mockResolvedValue(true),
    sendTrackResistance:   vi.fn().mockResolvedValue(true),
    sendUserConfiguration: vi.fn().mockResolvedValue(true),
    requestControl:        vi.fn().mockResolvedValue(true),
    subscribe:             vi.fn().mockResolvedValue(true),
    setCrr:                vi.fn(),
    setCw:                 vi.fn(),
    hasPeripheral:         vi.fn().mockReturnValue(true),
    reset:                 vi.fn(),
    startSensor:           vi.fn().mockResolvedValue(true),
    stopSensor:            vi.fn().mockResolvedValue(true),
    setSlope:              vi.fn().mockResolvedValue(true),
    setTargetPower:        vi.fn().mockResolvedValue(true),
    logEvent:              vi.fn(),
    on:                    vi.fn(),
    off:                   vi.fn(),
    once:                  vi.fn(),
    emit:                  vi.fn(),
    features:              { fitnessMachine: 0, targetSettings: 0 },
});

function makeAdapter() {
    const adapter = new BleTacxAdapter(
        { interface: 'ble', name: 'Tacx Neo 2T', address: 'aa:bb:cc:dd:ee:ff', protocol: 'tacx' },
        { logger: MockLogger }
    );
    const sensor = makeSensorMock();
    adapter['getSensor'] = vi.fn().mockReturnValue(sensor);
    return { adapter, sensor };
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('BleTacxAdapter', () => {

    describe('setRoadFeel', () => {

        test('delegates to sensor.sendRoadFeel with surface and intensity', async () => {
            const { adapter, sensor } = makeAdapter();
            const result = await adapter.setRoadFeel(RoadFeelSurface.Gravel, 75);
            expect(sensor.sendRoadFeel).toHaveBeenCalledWith(RoadFeelSurface.Gravel, 75);
            expect(result).toBe(true);
        });

        test('default intensity is 100', async () => {
            const { adapter, sensor } = makeAdapter();
            await adapter.setRoadFeel(RoadFeelSurface.Road);
            expect(sensor.sendRoadFeel).toHaveBeenCalledWith(RoadFeelSurface.Road, 100);
        });

        test('propagates false when sensor write fails', async () => {
            const { adapter, sensor } = makeAdapter();
            sensor.sendRoadFeel.mockResolvedValue(false);
            const result = await adapter.setRoadFeel(RoadFeelSurface.Ice, 50);
            expect(result).toBe(false);
        });

        test('propagates rejection from sensor', async () => {
            const { adapter, sensor } = makeAdapter();
            sensor.sendRoadFeel.mockRejectedValue(new Error('BLE disconnected'));
            await expect(adapter.setRoadFeel(RoadFeelSurface.Snow, 100))
                .rejects.toThrow('BLE disconnected');
        });

        test('calls getSensor once per invocation', async () => {
            const { adapter } = makeAdapter();
            await adapter.setRoadFeel(RoadFeelSurface.Road, 80);
            expect(adapter['getSensor']).toHaveBeenCalledTimes(1);
        });

        // ── parameterised: all 11 RoadFeelSurface enum values ────────────────
        const allSurfaces: Array<[string, RoadFeelSurface]> = [
            ['Off',              RoadFeelSurface.Off],
            ['Road',             RoadFeelSurface.Road],
            ['CobblestoneHard',  RoadFeelSurface.CobblestoneHard],
            ['CobblestoneEasy',  RoadFeelSurface.CobblestoneEasy],
            ['BrickRoad',        RoadFeelSurface.BrickRoad],
            ['Gravel',           RoadFeelSurface.Gravel],
            ['Ice',              RoadFeelSurface.Ice],
            ['WoodenPlanks',     RoadFeelSurface.WoodenPlanks],
            ['GravelLight',      RoadFeelSurface.GravelLight],
            ['GravelDeep',       RoadFeelSurface.GravelDeep],
            ['Snow',             RoadFeelSurface.Snow],
        ];

        test.each(allSurfaces)(
            'passes RoadFeelSurface.%s correctly to sensor',
            async (name, surface) => {
                const { adapter, sensor } = makeAdapter();
                await adapter.setRoadFeel(surface, 100);
                expect(sensor.sendRoadFeel).toHaveBeenCalledOnce();
                expect(sensor.sendRoadFeel).toHaveBeenCalledWith(surface, 100);
                const numericVal = sensor.sendRoadFeel.mock.calls[0][0] as number;
                expect(numericVal).toBe(RoadFeelSurface[name as keyof typeof RoadFeelSurface]);
            }
        );

    });

    // ── RoadFeelSurface enum sanity checks ───────────────────────────────────
    describe('RoadFeelSurface enum', () => {

        test('has correct numeric values for all 11 surfaces', () => {
            expect(RoadFeelSurface.Off).toBe(0);
            expect(RoadFeelSurface.Road).toBe(1);
            expect(RoadFeelSurface.CobblestoneHard).toBe(2);
            expect(RoadFeelSurface.CobblestoneEasy).toBe(3);
            expect(RoadFeelSurface.BrickRoad).toBe(4);
            expect(RoadFeelSurface.Gravel).toBe(5);
            expect(RoadFeelSurface.Ice).toBe(6);
            expect(RoadFeelSurface.WoodenPlanks).toBe(7);
            expect(RoadFeelSurface.GravelLight).toBe(8);
            expect(RoadFeelSurface.GravelDeep).toBe(9);
            expect(RoadFeelSurface.Snow).toBe(10);
        });

        test('covers exactly 11 surface types (values 0-10)', () => {
            const numericValues = Object.values(RoadFeelSurface)
                .filter((v): v is number => typeof v === 'number');
            expect(numericValues).toHaveLength(11);
            expect(Math.min(...numericValues)).toBe(0);
            expect(Math.max(...numericValues)).toBe(10);
        });

        test('string keys map 1:1 to their numeric values', () => {
            const entries = Object.entries(RoadFeelSurface)
                .filter(([, v]) => typeof v === 'number') as [string, number][];
            const names  = entries.map(([k]) => k);
            const values = entries.map(([, v]) => v);
            expect(new Set(names).size).toBe(names.length);
            expect(new Set(values).size).toBe(values.length);
        });

    });

});
