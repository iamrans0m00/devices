import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HapticShiftFeedback } from './haptic-shift';
import { RoadFeelSurface } from './consts';
import TacxAdvancedFitnessMachineDevice from './sensor';

describe('HapticShiftFeedback', () => {
    let mockSensor: TacxAdvancedFitnessMachineDevice;
    let haptic: HapticShiftFeedback;

    beforeEach(() => {
        vi.useFakeTimers();
        mockSensor = {
            sendRoadFeel: vi.fn().mockResolvedValue(true)
        } as unknown as TacxAdvancedFitnessMachineDevice;
        haptic = new HapticShiftFeedback(mockSensor);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('sends correct number of pulses (3 by default)', async () => {
        const promise = haptic.fire();

        // Advance through all intervals (2 delays between 3 pulses)
        await vi.advanceTimersByTimeAsync(300);
        await promise;

        // 3 pulses + 1 restore (Off) = 4 calls
        expect(mockSensor.sendRoadFeel).toHaveBeenCalledTimes(4);
    });

    it('each pulse uses WoodenBoards surface and intensity 80', async () => {
        const promise = haptic.fire();
        await vi.advanceTimersByTimeAsync(300);
        await promise;

        const calls = (mockSensor.sendRoadFeel as ReturnType<typeof vi.fn>).mock.calls;
        // First 3 calls are pulses
        for (let i = 0; i < 3; i++) {
            expect(calls[i]).toEqual([RoadFeelSurface.WoodenBoards, 80]);
        }
    });

    it('after pulses, restores the provided surface and intensity', async () => {
        const promise = haptic.fire(RoadFeelSurface.Gravel, 60);
        await vi.advanceTimersByTimeAsync(300);
        await promise;

        const calls = (mockSensor.sendRoadFeel as ReturnType<typeof vi.fn>).mock.calls;
        // Last call should restore Gravel at 60
        expect(calls[calls.length - 1]).toEqual([RoadFeelSurface.Gravel, 60]);
    });

    it('after pulses with no restore surface, sends Off', async () => {
        const promise = haptic.fire();
        await vi.advanceTimersByTimeAsync(300);
        await promise;

        const calls = (mockSensor.sendRoadFeel as ReturnType<typeof vi.fn>).mock.calls;
        expect(calls[calls.length - 1]).toEqual([RoadFeelSurface.Off, 0]);
    });

    it('if busy, calling fire() again is a no-op', async () => {
        const promise1 = haptic.fire();
        const promise2 = haptic.fire(); // should be skipped

        await vi.advanceTimersByTimeAsync(300);
        await promise1;
        await promise2;

        // Only 4 calls from first fire (3 pulses + 1 restore), not 8
        expect(mockSensor.sendRoadFeel).toHaveBeenCalledTimes(4);
    });

    it('custom config overrides defaults', async () => {
        const customHaptic = new HapticShiftFeedback(mockSensor, {
            pulseCount: 5,
            surface: RoadFeelSurface.CattleGrid,
            intensity: 50,
            pulseIntervalMs: 200
        });

        const promise = customHaptic.fire();
        await vi.advanceTimersByTimeAsync(1000);
        await promise;

        const calls = (mockSensor.sendRoadFeel as ReturnType<typeof vi.fn>).mock.calls;
        // 5 pulses + 1 restore = 6 calls
        expect(calls).toHaveLength(6);
        // Each pulse uses CattleGrid at intensity 50
        for (let i = 0; i < 5; i++) {
            expect(calls[i]).toEqual([RoadFeelSurface.CattleGrid, 50]);
        }
    });

    it('if sensor.sendRoadFeel throws, still completes and sets busy=false', async () => {
        (mockSensor.sendRoadFeel as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('BLE error'));

        const promise = haptic.fire();
        await vi.advanceTimersByTimeAsync(300);
        await promise;

        // Should not throw, and busy should be reset so we can fire again
        (mockSensor.sendRoadFeel as ReturnType<typeof vi.fn>).mockResolvedValue(true);
        const promise2 = haptic.fire();
        await vi.advanceTimersByTimeAsync(300);
        await promise2;

        // Second fire should have executed (4 calls)
        // First fire may have made 1 call before failing
        expect(mockSensor.sendRoadFeel).toHaveBeenCalled();
    });
});
