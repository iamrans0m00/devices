import TacxAdvancedFitnessMachineDevice from './sensor';
import { RoadFeelSurface } from './consts';

export interface HapticShiftConfig {
    pulseCount?: number;       // default 3
    pulseIntervalMs?: number;  // default 100
    surface?: RoadFeelSurface; // default WoodenBoards (9)
    intensity?: number;        // default 80
}

export class HapticShiftFeedback {
    private sensor: TacxAdvancedFitnessMachineDevice;
    private config: Required<HapticShiftConfig>;
    private busy: boolean = false;

    constructor(sensor: TacxAdvancedFitnessMachineDevice, config?: HapticShiftConfig) {
        this.sensor = sensor;
        this.config = {
            pulseCount: config?.pulseCount ?? 3,
            pulseIntervalMs: config?.pulseIntervalMs ?? 100,
            surface: config?.surface ?? RoadFeelSurface.WoodenBoards,
            intensity: config?.intensity ?? 80
        };
    }

    /**
     * Fire haptic shift pulses. If already firing, skip (don't queue).
     *
     * @param restoreSurface  The surface to restore after pulses (null = turn off)
     * @param restoreIntensity  The intensity to restore
     */
    async fire(restoreSurface: RoadFeelSurface | null = null, restoreIntensity: number = 100): Promise<void> {
        if (this.busy) return;
        this.busy = true;

        try {
            for (let i = 0; i < this.config.pulseCount; i++) {
                await this.sensor.sendRoadFeel(this.config.surface, this.config.intensity);
                if (i < this.config.pulseCount - 1) {
                    await this.delay(this.config.pulseIntervalMs);
                }
            }

            // Restore previous surface (or turn off)
            if (restoreSurface !== null) {
                await this.sensor.sendRoadFeel(restoreSurface, restoreIntensity);
            } else {
                await this.sensor.sendRoadFeel(RoadFeelSurface.Off, 0);
            }
        } catch {
            // best-effort — don't break the control loop
        } finally {
            this.busy = false;
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
