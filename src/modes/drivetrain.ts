export type DrivetrainType = '1x' | '2x' | '3x'

export interface DrivetrainConfig {
    type: DrivetrainType
    chainrings: number[]   // largest first
    cassette: number[]     // smallest first
}

export interface GearPosition {
    chainringIndex: number
    cogIndex: number
}

export const CASSETTE_PRESETS: { label: string; cogs: number[] }[] = [
    // 11-speed
    { label: '11-28T 11-speed', cogs: [11, 12, 13, 14, 15, 17, 19, 21, 23, 25, 28] },
    { label: '11-32T 11-speed', cogs: [11, 12, 13, 14, 16, 18, 20, 22, 25, 28, 32] },
    { label: '11-34T 11-speed', cogs: [11, 13, 15, 17, 19, 21, 23, 25, 27, 30, 34] },

    // 12-speed
    { label: '11-28T 12-speed', cogs: [11, 12, 13, 14, 15, 16, 17, 19, 21, 23, 25, 28] },
    { label: '11-34T 12-speed', cogs: [11, 13, 15, 17, 19, 21, 23, 25, 27, 30, 32, 34] },
    { label: '11-36T 12-speed', cogs: [11, 13, 15, 17, 19, 21, 24, 27, 30, 33, 35, 36] },
    { label: '10-36T 12-speed', cogs: [10, 12, 14, 16, 18, 21, 24, 28, 30, 33, 35, 36] },
    { label: '10-44T 12-speed', cogs: [10, 12, 14, 16, 18, 21, 24, 28, 32, 36, 40, 44] },
    { label: '10-52T 12-speed', cogs: [10, 12, 14, 16, 18, 21, 24, 28, 33, 39, 45, 52] },

    // 10-speed
    { label: '11-42T 10-speed', cogs: [11, 13, 15, 18, 22, 26, 30, 34, 38, 42] },
    { label: '11-36T 10-speed', cogs: [11, 13, 15, 17, 19, 21, 24, 28, 32, 36] },
]

export class Drivetrain {
    readonly chainrings: number[]
    readonly cassette: number[]

    constructor(config: DrivetrainConfig) {
        this.chainrings = config.chainrings
        this.cassette = config.cassette
    }

    get cogCount(): number {
        return this.cassette.length
    }

    get chainringCount(): number {
        return this.chainrings.length
    }

    getGearRatio(chainringIndex: number, cogIndex: number): number {
        return this.chainrings[chainringIndex] / this.cassette[cogIndex]
    }

    getStartingGear(): GearPosition {
        return {
            chainringIndex: this.chainrings.length - 1,
            cogIndex: Math.max(0, this.cassette.length - 3)
        }
    }
}
