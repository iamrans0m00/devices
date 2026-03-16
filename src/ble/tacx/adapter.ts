import {EventLogger} from 'gd-eventlog';
import { BleFmAdapter} from '../fm/index.js';
import TacxAdvancedFitnessMachineDevice from './sensor.js';
import { RoadFeelSurface } from './consts.js';
import { HapticShiftFeedback } from './haptic-shift.js';
import { DEFAULT_BIKE_WEIGHT, DEFAULT_USER_WEIGHT } from "../../base/consts.js";
import { BleDeviceSettings, BleStartProperties, IBlePeripheral } from '../types.js';
import { DeviceProperties,IncyclistCapability,IAdapter } from '../../types/index.js';
import { LegacyProfile } from '../../antv2/types.js';



export default class BleTacxAdapter extends BleFmAdapter {
    protected static INCYCLIST_PROFILE_NAME:LegacyProfile = 'Smart Trainer'
    protected activeRoadFeel: { surface: RoadFeelSurface; intensity: number } | null = null
    protected hapticShift: HapticShiftFeedback | null = null

    constructor( settings:BleDeviceSettings, props?:DeviceProperties) {

        super(settings,props);

        this.logger = new EventLogger('BLE-FEC-Tacx')

        this.device = new TacxAdvancedFitnessMachineDevice( this.getPeripheral(),{logger:this.logger})
        this.capabilities = [
            IncyclistCapability.Power, IncyclistCapability.Speed, IncyclistCapability.Cadence,
            IncyclistCapability.Control
        ]


    }

    isSame(device:IAdapter):boolean {
        if (!(device instanceof BleTacxAdapter))
            return false;
        return this.isEqual(device.settings as BleDeviceSettings)
    }

    updateSensor(peripheral:IBlePeripheral) {
        this.device = new TacxAdvancedFitnessMachineDevice( peripheral, {logger:this.logger})
    }

    getProfile():LegacyProfile {
        return 'Smart Trainer'
    }


    protected async initControl(props?:BleStartProperties) {
        const sensor = this.getSensor() as TacxAdvancedFitnessMachineDevice

        const {user, wheelDiameter, gearRatio,bikeWeight=DEFAULT_BIKE_WEIGHT} = props || {}
        const userWeight = (user?.weight ?? DEFAULT_USER_WEIGHT);
        

        sensor.sendTrackResistance(0.0);
        sensor.sendUserConfiguration( userWeight, bikeWeight, wheelDiameter, gearRatio);

        const startRequest = this.getCyclingMode().getBikeInitRequest()
        await this.sendUpdate(startRequest);

        this.hapticShift = new HapticShiftFeedback(sensor);
    }

    protected async checkCapabilities():Promise<void> {
        const before = this.capabilities.join(',')
        const sensor = this.getSensor()

        if (sensor.features && sensor.features.heartrate && !this.hasCapability(IncyclistCapability.HeartRate)) {
            this.capabilities.push(IncyclistCapability.HeartRate)
        }

        const after = this.capabilities.join(',')

        if (before !== after) {
            this.emit('device-info', this.getSettings(), {capabilities:this.capabilities})
        }
    }


    /**
     * Activate road feel (road surface simulation) on the Tacx Neo.
     *
     * The surface command must be re-sent alongside every slope update
     * because the trainer resets road feel when it receives a new
     * Track Resistance (0x33) page.  Calling this method stores the
     * desired surface so that {@link sendUpdate} will continuously
     * reinforce it.
     *
     * @param surface   Road surface. Use {@link RoadFeelSurface} enum.
     *                  Pass {@link RoadFeelSurface.Off} (0) to disable.
     * @param intensity Vibration intensity 0-100 % (default 100).
     */
    async setRoadFeel(surface: RoadFeelSurface, intensity: number = 100): Promise<boolean> {
        this.logEvent({message:'setRoadFeel called', surface, intensity, prevSurface: this.activeRoadFeel?.surface})

        if (surface === RoadFeelSurface.Off) {
            this.activeRoadFeel = null
        } else {
            this.activeRoadFeel = { surface, intensity }
        }

        // Protocol accepts 0-100 (percentage) or 255 (default/full).
        // The API already uses 0-100 so pass through directly.
        const sensor = this.getSensor() as TacxAdvancedFitnessMachineDevice;
        return sensor.sendRoadFeel(surface, intensity);
    }

    async fireShiftHaptic(): Promise<void> {
        if (!this.hapticShift) return;

        const restoreSurface = this.activeRoadFeel?.surface ?? null;
        const restoreIntensity = this.activeRoadFeel?.intensity ?? 100;

        await this.hapticShift.fire(restoreSurface, restoreIntensity);
    }

    /**
     * Override sendUpdate to piggyback road feel on every control cycle.
     *
     * The base class sends slope/power/resistance every ~1 s.  If road
     * feel is active we append a 0xDD page so the trainer maintains the
     * vibration between slope ticks.
     */
    async sendUpdate(request, enforced = false) {
        const hasGearChange = request?.gearDelta !== undefined || request?.frontDelta !== undefined;

        const result = await super.sendUpdate(request, enforced)

        // Fire haptic feedback on gear changes (non-blocking, fire-and-forget)
        if (hasGearChange && this.hapticShift) {
            this.fireShiftHaptic().catch(() => {});
        }

        // Re-send road feel after each slope update so the trainer keeps it
        if (this.activeRoadFeel) {
            const sensor = this.getSensor() as TacxAdvancedFitnessMachineDevice
            try {
                await sensor.sendRoadFeel(
                    this.activeRoadFeel.surface,
                    this.activeRoadFeel.intensity,
                )
            } catch {
                // best-effort; don't break the control loop
            }
        }

        return result
    }

}
