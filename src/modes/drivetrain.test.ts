import { Drivetrain, DrivetrainConfig, CASSETTE_PRESETS } from './drivetrain'

describe('Drivetrain', () => {

    const config1x: DrivetrainConfig = {
        type: '1x',
        chainrings: [40],
        cassette: [11, 13, 15, 17, 19, 21, 24, 28, 32, 36, 42]
    }

    const config2x: DrivetrainConfig = {
        type: '2x',
        chainrings: [50, 34],
        cassette: [11, 12, 13, 14, 15, 17, 19, 21, 24, 28, 32]
    }

    describe('creation', () => {
        test('1x drivetrain creation from config', () => {
            const dt = new Drivetrain(config1x)
            expect(dt.chainringCount).toBe(1)
            expect(dt.cogCount).toBe(11)
        })

        test('2x drivetrain creation from config', () => {
            const dt = new Drivetrain(config2x)
            expect(dt.chainringCount).toBe(2)
            expect(dt.cogCount).toBe(11)
        })
    })

    describe('getGearRatio', () => {
        test('1x gear ratio calculation (chainring/cog)', () => {
            const dt = new Drivetrain(config1x)
            // 40 / 11 = 3.6363...
            expect(dt.getGearRatio(0, 0)).toBeCloseTo(40 / 11, 5)
            // 40 / 42 = 0.9523...
            expect(dt.getGearRatio(0, 10)).toBeCloseTo(40 / 42, 5)
        })

        test('2x gear ratio calculation (uses selected chainring)', () => {
            const dt = new Drivetrain(config2x)
            // big ring: 50/11
            expect(dt.getGearRatio(0, 0)).toBeCloseTo(50 / 11, 5)
            // small ring: 34/11
            expect(dt.getGearRatio(1, 0)).toBeCloseTo(34 / 11, 5)
            // small ring, big cog: 34/32
            expect(dt.getGearRatio(1, 10)).toBeCloseTo(34 / 32, 5)
        })
    })

    describe('getStartingGear', () => {
        test('2x returns smallest chainring index and 3rd largest cog index', () => {
            const dt = new Drivetrain(config2x)
            const gear = dt.getStartingGear()
            // smallest chainring is last index (1)
            expect(gear.chainringIndex).toBe(1)
            // 3rd largest cog: cassette.length - 3 = 11 - 3 = 8
            expect(gear.cogIndex).toBe(8)
        })

        test('1x chainring index is 0', () => {
            const dt = new Drivetrain(config1x)
            const gear = dt.getStartingGear()
            expect(gear.chainringIndex).toBe(0)
            expect(gear.cogIndex).toBe(8) // 11 - 3 = 8
        })

        test('short cassette clamps properly', () => {
            const shortConfig: DrivetrainConfig = {
                type: '1x',
                chainrings: [40],
                cassette: [14, 16]
            }
            const dt = new Drivetrain(shortConfig)
            const gear = dt.getStartingGear()
            expect(gear.chainringIndex).toBe(0)
            // cassette.length - 3 = -1, should clamp to 0
            expect(gear.cogIndex).toBe(0)
        })
    })
})

describe('CASSETTE_PRESETS', () => {
    test('contains common cassettes', () => {
        expect(CASSETTE_PRESETS.length).toBeGreaterThanOrEqual(11)

        const labels = CASSETTE_PRESETS.map(p => p.label)
        expect(labels).toContain('11-28T 11-speed')
        expect(labels).toContain('11-32T 11-speed')
        expect(labels).toContain('11-34T 11-speed')
        expect(labels).toContain('11-28T 12-speed')
        expect(labels).toContain('11-34T 12-speed')
        expect(labels).toContain('11-36T 12-speed')
        expect(labels).toContain('10-36T 12-speed')
        expect(labels).toContain('10-44T 12-speed')
        expect(labels).toContain('10-52T 12-speed')
        expect(labels).toContain('11-42T 10-speed')
        expect(labels).toContain('11-36T 10-speed')
    })

    test('each preset cog count matches the speed count in its label', () => {
        for (const preset of CASSETTE_PRESETS) {
            const match = preset.label.match(/(\d+)-speed/)
            expect(match).not.toBeNull()
            const speedCount = Number(match![1])
            expect(preset.cogs).toHaveLength(speedCount)
        }
    })
})
