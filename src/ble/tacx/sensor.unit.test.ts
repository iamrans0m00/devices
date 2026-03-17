import TacxAdvancedFitnessMachineDevice from "./sensor";
import {TACX_FE_C_RX, TACX_FE_C_TX} from "./consts";
import { MockLogger } from "../../../test/logger";
import { CSP_MEASUREMENT } from "../consts";

describe('Tacx Sensor',()=>{

    describe('constructor',()=>{

        test('without peripheral',()=>{
            const c = new TacxAdvancedFitnessMachineDevice(null,{id:'4711',logger:MockLogger})

            // statics
            expect(c.getProfile()).toBe('Smart Trainer')
            expect(c.getProtocol()).toBe('tacx')
            expect(c.getServiceUUids()).toEqual(['6E40FEC1-B5A3-F393-E0A9-E50E24DCCA9E'])


        })
        test('with peripheral',()=>{
            
        })


    })


    describe('onData',()=>{

        let sensor: TacxAdvancedFitnessMachineDevice
        let logSpy = jest.fn()
        const send = (d)=>sensor.onData(TACX_FE_C_RX,Buffer.from(d,'hex'))

        beforeEach(()=>{
            sensor = new TacxAdvancedFitnessMachineDevice(null)
            sensor.logEvent = logSpy
        })

        afterEach(()=>{
            jest.resetAllMocks()
        })

        test('Missing SYNC',()=>{          
            expect(send('12a4094e05191f00000000402080')).toBeUndefined()
            expect(logSpy).toHaveBeenCalledWith({message:'SYNC missing',raw:'12a4094e05191f00000000402080'})
        })

        test('Valid TacxRx GeneralFE data',()=>{
            expect(send('a4094e05101900000000ff2434')).toEqual({State:'READY', EquipmentType:'Trainer', speed:0, raw:expect.any(String)})   
            expect(send('a4094e05101900000000303534')).toMatchObject({State:'IN_USE', EquipmentType:'Trainer', heartrate:48})
            expect(send('a4094e05101900000000ff1434')).toMatchObject({State:'OFF'})   
            expect(send('a4094e05101900000000ff4434')).toMatchObject({State:'FINISHED'})   
        })

        
        test('Valid TacxRx Trainer data',()=>{
            expect(send('a4094e05191f00000000402080')).toMatchObject({State:'READY'})
        })
        test('Valid TacxRx Product information',()=>{
            expect(send('a4094e0551ff00070f57000017')).toMatchObject({SerialNumber:22287, SwVersion:7})
        })


        test('repeated messages in state READY',()=>{

            send('a4094e011945ff2acf6d0020e9')
            expect(send('a4094e01194cff25d26b0020f4')).toMatchObject({instantaneousPower:107})
        })

        test('power',()=>{
           
            sensor.onData(CSP_MEASUREMENT,Buffer.from([3,119,1,0,0,195,176,48,0,0,32]));
            const res = sensor.onData(CSP_MEASUREMENT, Buffer.from([3,119,1,0,0,195,176,48,0,0,56]));
            expect(res).toMatchObject({instantaneousPower:1})
        }) 
    
    
        test('repeated message',()=>{
    
            sensor.emit = jest.fn()
    
            sensor.onData('2a5b',Buffer.from([3,119,1,0,0,195,176,48,0,0,32]));
            sensor.onData('0x2a5b',Buffer.from([3,119,1,0,0,195,176,48,0,0,32]));
            sensor.onData('2a5b',Buffer.from([3,119,1,0,0,195,176,48,0,0,32]));
            sensor.onData('2a5b',Buffer.from([3,119,1,0,0,195,176,48,0,0,32]));
            expect(sensor.emit).toHaveBeenCalledTimes(1)
        }) 


    })

    describe ('setSlope',()=>{
    
        test('slope 0.0, rr not set',async ()=>{
            const expected = Buffer.from( 'A4094F0533FFFFFFFF204E42F8','hex')
            const peripheral = {
                write: jest.fn().mockResolvedValue(expected),
                isConnected: jest.fn().mockReturnValue(true)
            }
            const tacx = new TacxAdvancedFitnessMachineDevice(peripheral, {id:'4711',logger:MockLogger});
            
            const res = await tacx.setSlope(0.0)
            expect(res).toBe(true)
            expect(peripheral.write).toHaveBeenCalledWith(TACX_FE_C_TX, expected,{withoutResponse:true})
        })
        test('not connected',async ()=>{
            const expected = Buffer.from( 'A4094F0533FFFFFFFF204E42F8','hex')
            const peripheral = {
                write: jest.fn().mockResolvedValue(expected),
                isConnected: jest.fn().mockReturnValue(false)
            }
            const tacx = new TacxAdvancedFitnessMachineDevice(peripheral, {id:'4711',logger:MockLogger});
            
            const res = await tacx.setSlope(0.0)
            expect(res).toBe(false)
            expect(peripheral.write).not.toHaveBeenCalled()
        })
    
    
    })


    describe('sendRoadFeel', () => {

        let sensor: TacxAdvancedFitnessMachineDevice;

        const makePeripheral = () => ({
            write: vi.fn().mockResolvedValue(true),
            isConnected: vi.fn().mockReturnValue(true),
        });

        beforeEach(() => {
            sensor = new TacxAdvancedFitnessMachineDevice(null, { id: '4711', logger: MockLogger });
        });

        /**
         * Neo Modes page 0xFC message layout (13 bytes):
         *   [0] A4   SYNC
         *   [1] 09   length
         *   [2] 4F   Acknowledged Data
         *   [3] 05   channel
         *   [4] FC   Neo Modes page
         *   [5] 00   reserved
         *   [6] 00   isokinetic mode (off)
         *   [7] 00   isokinetic speed (0)
         *   [8] 00   reserved
         *   [9] XX   road surface (0-9)
         *  [10] YY   road surface intensity (0-100 or 255)
         *  [11] 00   reserved
         *  [12] ZZ   additive checksum: sum(bytes[1..11]) & 0xFF
         */

        test('Concrete at full intensity (100%) sends correct Neo Modes page 0xFC bytes', async () => {
            // surface=1, intensity=100 (0x64) → checksum = (345+1+100) & 0xFF = 0xBE
            const expected = Buffer.from('A4094F05FC00000000016400BE', 'hex');
            const peripheral = makePeripheral();
            sensor = new TacxAdvancedFitnessMachineDevice(peripheral, { id: '4711', logger: MockLogger });

            const res = await sensor.sendRoadFeel(1, 100);

            expect(res).toBe(true);
            expect(peripheral.write).toHaveBeenCalledWith(TACX_FE_C_TX, expected, { withoutResponse: true });
        });

        test('Off (surface=0, intensity=0) sends correct bytes', async () => {
            // checksum = 345 & 0xFF = 0x59
            const expected = Buffer.from('A4094F05FC0000000000000059', 'hex');
            const peripheral = makePeripheral();
            sensor = new TacxAdvancedFitnessMachineDevice(peripheral, { id: '4711', logger: MockLogger });

            const res = await sensor.sendRoadFeel(0, 0);

            expect(res).toBe(true);
            expect(peripheral.write).toHaveBeenCalledWith(TACX_FE_C_TX, expected, { withoutResponse: true });
        });

        test('CobblestonesHard at 50% intensity sends correct bytes', async () => {
            // surface=3, intensity=50 (0x32) → checksum = (345+3+50) & 0xFF = 0x8E
            const expected = Buffer.from('A4094F05FC000000000332008E', 'hex');
            const peripheral = makePeripheral();
            sensor = new TacxAdvancedFitnessMachineDevice(peripheral, { id: '4711', logger: MockLogger });

            const res = await sensor.sendRoadFeel(3, 50);

            expect(res).toBe(true);
            expect(peripheral.write).toHaveBeenCalledWith(TACX_FE_C_TX, expected, { withoutResponse: true });
        });

        test('intensity is clamped to 100 when above 100 (non-255)', async () => {
            // surface=1, 150 → clamp to 100 → same as full
            const expected = Buffer.from('A4094F05FC00000000016400BE', 'hex');
            const peripheral = makePeripheral();
            sensor = new TacxAdvancedFitnessMachineDevice(peripheral, { id: '4711', logger: MockLogger });

            await sensor.sendRoadFeel(1, 150);

            expect(peripheral.write).toHaveBeenCalledWith(TACX_FE_C_TX, expected, { withoutResponse: true });
        });

        test('intensity is clamped to 0 when below 0', async () => {
            // surface=1, intensity=0 → checksum = (345+1) & 0xFF = 0x5A
            const expected = Buffer.from('A4094F05FC000000000100005A', 'hex');
            const peripheral = makePeripheral();
            sensor = new TacxAdvancedFitnessMachineDevice(peripheral, { id: '4711', logger: MockLogger });

            await sensor.sendRoadFeel(1, -10);

            expect(peripheral.write).toHaveBeenCalledWith(TACX_FE_C_TX, expected, { withoutResponse: true });
        });

        test('intensity 255 is passed through as special "default" value', async () => {
            // surface=1, intensity=255 (0xFF) → checksum = (345+1+255) & 0xFF = 0x59
            const expected = Buffer.from('A4094F05FC0000000001FF0059', 'hex');
            const peripheral = makePeripheral();
            sensor = new TacxAdvancedFitnessMachineDevice(peripheral, { id: '4711', logger: MockLogger });

            await sensor.sendRoadFeel(1, 255);

            expect(peripheral.write).toHaveBeenCalledWith(TACX_FE_C_TX, expected, { withoutResponse: true });
        });

        test('default intensity is 100', async () => {
            // surface=1, default intensity=100 → same as explicit 100
            const expected = Buffer.from('A4094F05FC00000000016400BE', 'hex');
            const peripheral = makePeripheral();
            sensor = new TacxAdvancedFitnessMachineDevice(peripheral, { id: '4711', logger: MockLogger });

            await sensor.sendRoadFeel(1);

            expect(peripheral.write).toHaveBeenCalledWith(TACX_FE_C_TX, expected, { withoutResponse: true });
        });

        test('returns false when write fails', async () => {
            const peripheral = {
                write: vi.fn().mockRejectedValue(new Error('BLE error')),
                isConnected: vi.fn().mockReturnValue(true),
            };
            sensor = new TacxAdvancedFitnessMachineDevice(peripheral, { id: '4711', logger: MockLogger });

            const res = await sensor.sendRoadFeel(1, 100);

            expect(res).toBe(false);
        });


        // ── parameterised: every RoadFeelSurface at 100 % intensity ──────────
        describe('all RoadFeelSurface values at 100% intensity', () => {

            /**
             * Neo Modes page 0xFC with additive checksum.
             * Base checksum (bytes[1..8]): 09+4F+05+FC+00+00+00+00 = 345
             * Full checksum: (345 + surface + 100) & 0xFF
             *
             * Intensity byte = 0x64 (100 decimal).
             */
            const surfaceCases: Array<[string, number, string]> = [
                ['Off',              0,  'A4094F05FC00000000006400BD'],
                ['Concrete',         1,  'A4094F05FC00000000016400BE'],
                ['CattleGrid',       2,  'A4094F05FC00000000026400BF'],
                ['CobblestonesHard', 3,  'A4094F05FC00000000036400C0'],
                ['CobblestonesSoft', 4,  'A4094F05FC00000000046400C1'],
                ['BrickRoad',        5,  'A4094F05FC00000000056400C2'],
                ['OffRoad',          6,  'A4094F05FC00000000066400C3'],
                ['Gravel',           7,  'A4094F05FC00000000076400C4'],
                ['Ice',              8,  'A4094F05FC00000000086400C5'],
                ['WoodenBoards',     9,  'A4094F05FC00000000096400C6'],
            ];

            test.each(surfaceCases)(
                '%s (surface=%i) produces correct 13-byte Neo Modes page 0xFC message',
                async (_name, surfaceValue, expectedHex) => {
                    const expected = Buffer.from(expectedHex, 'hex');
                    const peripheral = makePeripheral();
                    sensor = new TacxAdvancedFitnessMachineDevice(peripheral, { id: '4711', logger: MockLogger });

                    const res = await sensor.sendRoadFeel(surfaceValue, 100);

                    expect(res).toBe(true);
                    expect(peripheral.write).toHaveBeenCalledOnce();
                    expect(peripheral.write).toHaveBeenCalledWith(TACX_FE_C_TX, expected, { withoutResponse: true });
                }
            );

        });

    }); // ── sendRoadFeel ──

}) // ── Tacx Sensor ──
