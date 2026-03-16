import { Drivetrain, DrivetrainConfig, CASSETTE_PRESETS, GearPosition } from './drivetrain'

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

    test('constructor sorts chainrings largest-first and cassette smallest-first', () => {
        const dt = new Drivetrain({
            type: '2x',
            chainrings: [34, 50],  // wrong order (should be 50, 34)
            cassette: [28, 11, 21, 15]  // wrong order
        })
        expect(dt.chainrings).toEqual([50, 34])
        expect(dt.cassette).toEqual([11, 15, 21, 28])
    })

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

describe('Gear State Machine', () => {

    const config2x: DrivetrainConfig = {
        type: '2x',
        chainrings: [50, 34],
        cassette: [11, 12, 13, 14, 15, 17, 19, 21, 24, 28, 32]
    }

    const config1x: DrivetrainConfig = {
        type: '1x',
        chainrings: [40],
        cassette: [11, 13, 15, 17, 19, 21, 24, 28, 32, 36, 42]
    }

    describe('initial position', () => {
        test('position matches getStartingGear()', () => {
            const dt = new Drivetrain(config2x)
            const expected = dt.getStartingGear()
            expect(dt.position).toEqual(expected)
        })
    })

    describe('shiftRear', () => {
        test('shiftRear(1) moves one cog harder (decreases cogIndex)', () => {
            const dt = new Drivetrain(config2x)
            const startCog = dt.position.cogIndex
            const result = dt.shiftRear(1)
            expect(result).not.toBeNull()
            expect(result!.cogIndex).toBe(startCog - 1)
            expect(dt.position.cogIndex).toBe(startCog - 1)
        })

        test('shiftRear(-1) moves one cog easier (increases cogIndex)', () => {
            const dt = new Drivetrain(config2x)
            const startCog = dt.position.cogIndex
            const result = dt.shiftRear(-1)
            expect(result).not.toBeNull()
            expect(result!.cogIndex).toBe(startCog + 1)
            expect(dt.position.cogIndex).toBe(startCog + 1)
        })

        test('shiftRear at hardest limit (cogIndex 0) returns null', () => {
            const dt = new Drivetrain(config2x)
            // Move to hardest cog
            while (dt.shiftRear(1) !== null) { /* keep shifting */ }
            expect(dt.position.cogIndex).toBe(0)
            const result = dt.shiftRear(1)
            expect(result).toBeNull()
            expect(dt.position.cogIndex).toBe(0) // unchanged
        })

        test('shiftRear at easiest limit (last cogIndex) returns null', () => {
            const dt = new Drivetrain(config2x)
            // Move to easiest cog
            while (dt.shiftRear(-1) !== null) { /* keep shifting */ }
            expect(dt.position.cogIndex).toBe(config2x.cassette.length - 1)
            const result = dt.shiftRear(-1)
            expect(result).toBeNull()
            expect(dt.position.cogIndex).toBe(config2x.cassette.length - 1)
        })
    })

    describe('shiftFront', () => {
        test('shiftFront(1) moves to bigger chainring (decreases chainringIndex)', () => {
            const dt = new Drivetrain(config2x)
            // Starting gear is chainringIndex 1 (small ring)
            expect(dt.position.chainringIndex).toBe(1)
            const result = dt.shiftFront(1)
            expect(result).not.toBeNull()
            expect(result!.chainringIndex).toBe(0) // big ring
            expect(dt.position.chainringIndex).toBe(0)
        })

        test('shiftFront(-1) moves to smaller chainring (increases chainringIndex)', () => {
            const dt = new Drivetrain(config2x)
            // First shift to big ring
            dt.shiftFront(1)
            expect(dt.position.chainringIndex).toBe(0)
            const result = dt.shiftFront(-1)
            expect(result).not.toBeNull()
            expect(result!.chainringIndex).toBe(1) // small ring
        })

        test('shiftFront at big ring limit returns null', () => {
            const dt = new Drivetrain(config2x)
            dt.shiftFront(1) // go to big ring (index 0)
            const result = dt.shiftFront(1) // try to go bigger
            expect(result).toBeNull()
            expect(dt.position.chainringIndex).toBe(0)
        })

        test('shiftFront on 1x always returns null', () => {
            const dt = new Drivetrain(config1x)
            expect(dt.shiftFront(1)).toBeNull()
            expect(dt.shiftFront(-1)).toBeNull()
            expect(dt.position.chainringIndex).toBe(0)
        })
    })

    describe('getCurrentGearRatio', () => {
        test('returns correct ratio for current position', () => {
            const dt = new Drivetrain(config2x)
            const pos = dt.position
            const expected = config2x.chainrings[pos.chainringIndex] / config2x.cassette[pos.cogIndex]
            expect(dt.getCurrentGearRatio()).toBeCloseTo(expected, 5)
        })
    })

    describe('synchroShiftRear', () => {
        test('synchroShift off: behaves like shiftRear', () => {
            const dt = new Drivetrain(config2x)
            dt.synchroShift = false
            // Move to hardest cog
            while (dt.shiftRear(1) !== null) { /* keep shifting */ }
            expect(dt.position.cogIndex).toBe(0)
            const result = dt.synchroShiftRear(1)
            expect(result).toBeNull()
        })

        test('synchroShift on: rear at hardest limit auto-shifts front up and resets rear to easiest', () => {
            const dt = new Drivetrain(config2x)
            dt.synchroShift = true
            // Starting at small ring (index 1). Move to hardest cog.
            while (dt.shiftRear(1) !== null) { /* keep shifting */ }
            expect(dt.position.cogIndex).toBe(0)
            expect(dt.position.chainringIndex).toBe(1) // small ring

            const result = dt.synchroShiftRear(1)
            expect(result).not.toBeNull()
            expect(result!.chainringIndex).toBe(0) // shifted to big ring
            expect(result!.cogIndex).toBe(config2x.cassette.length - 1) // reset to easiest cog
        })

        test('synchroShift on: rear at easiest limit auto-shifts front down and resets rear to hardest', () => {
            const dt = new Drivetrain(config2x)
            dt.synchroShift = true
            // Shift to big ring first
            dt.shiftFront(1)
            expect(dt.position.chainringIndex).toBe(0)
            // Move to easiest cog
            while (dt.shiftRear(-1) !== null) { /* keep shifting */ }
            expect(dt.position.cogIndex).toBe(config2x.cassette.length - 1)

            const result = dt.synchroShiftRear(-1)
            expect(result).not.toBeNull()
            expect(result!.chainringIndex).toBe(1) // shifted to small ring
            expect(result!.cogIndex).toBe(0) // reset to hardest cog
        })

        test('synchroShift on: rear at limit AND front at limit returns null', () => {
            const dt = new Drivetrain(config2x)
            dt.synchroShift = true
            // Already at small ring (index 1). Move to easiest cog.
            while (dt.shiftRear(-1) !== null) { /* keep shifting */ }
            expect(dt.position.chainringIndex).toBe(1) // small ring (last index)
            expect(dt.position.cogIndex).toBe(config2x.cassette.length - 1)

            // Try shifting easier - front is already at smallest ring
            const result = dt.synchroShiftRear(-1)
            expect(result).toBeNull()
        })
    })
})
