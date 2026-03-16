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
    position: GearPosition
    synchroShift: boolean = false

    constructor(config: DrivetrainConfig) {
        this.chainrings = config.chainrings
        this.cassette = config.cassette
        this.position = this.getStartingGear()
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

    shiftRear(delta: number): GearPosition | null {
        // delta > 0 = harder = smaller cog = decrease cogIndex
        // delta < 0 = easier = bigger cog = increase cogIndex
        const newCogIndex = this.position.cogIndex - delta
        if (newCogIndex < 0 || newCogIndex > this.cassette.length - 1) {
            return null
        }
        this.position = { ...this.position, cogIndex: newCogIndex }
        return this.position
    }

    shiftFront(delta: number): GearPosition | null {
        // delta > 0 = bigger chainring = decrease chainringIndex (largest first)
        // delta < 0 = smaller chainring = increase chainringIndex
        const newChainringIndex = this.position.chainringIndex - delta
        if (newChainringIndex < 0 || newChainringIndex > this.chainrings.length - 1) {
            return null
        }
        this.position = { ...this.position, chainringIndex: newChainringIndex }
        return this.position
    }

    synchroShiftRear(delta: number): GearPosition | null {
        if (!this.synchroShift) {
            return this.shiftRear(delta)
        }

        const result = this.shiftRear(delta)
        if (result !== null) {
            return result
        }

        // Rear hit the limit, try to auto-shift front
        if (delta > 0 && this.position.cogIndex === 0) {
            // At hardest rear cog, try shifting front to bigger chainring
            const frontResult = this.shiftFront(1)
            if (frontResult === null) {
                return null
            }
            // Reset rear to easiest cog
            this.position = { ...this.position, cogIndex: this.cassette.length - 1 }
            return this.position
        }

        if (delta < 0 && this.position.cogIndex === this.cassette.length - 1) {
            // At easiest rear cog, try shifting front to smaller chainring
            const frontResult = this.shiftFront(-1)
            if (frontResult === null) {
                return null
            }
            // Reset rear to hardest cog
            this.position = { ...this.position, cogIndex: 0 }
            return this.position
        }

        return null
    }

    getCurrentGearRatio(): number {
        return this.getGearRatio(this.position.chainringIndex, this.position.cogIndex)
    }
}
